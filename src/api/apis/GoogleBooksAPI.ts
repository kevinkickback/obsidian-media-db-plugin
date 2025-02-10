import { BookModel } from "src/models/BookModel";
import type MediaDbPlugin from "../../main";
import type { MediaTypeModel } from "../../models/MediaTypeModel";
import { MediaType } from "../../utils/MediaType";
import { APIModel } from "../APIModel";

interface GoogleBooksIndustryIdentifier {
	type: string;
	identifier: string;
}

interface GoogleBooksImageLinks {
	smallThumbnail?: string;
	thumbnail?: string;
	small?: string;
	medium?: string;
	large?: string;
	extraLarge?: string;
}

interface GoogleBooksVolumeInfo {
	title: string;
	subtitle?: string;
	authors?: string[];
	publisher?: string;
	publishedDate?: string;
	description?: string;
	industryIdentifiers?: GoogleBooksIndustryIdentifier[];
	pageCount?: number;
	categories?: string[];
	averageRating?: number;
	imageLinks?: GoogleBooksImageLinks;
	language?: string;
	canonicalVolumeLink?: string;
}

interface GoogleBooksSearchResult {
	id: string;
	volumeInfo: GoogleBooksVolumeInfo;
	selfLink: string;
}

interface GroupedEdition {
	mainTitle: string;
	editions: MediaTypeModel[];
}

export class GoogleBooksAPI extends APIModel {
	plugin: MediaDbPlugin;

	constructor(plugin: MediaDbPlugin) {
		super();

		this.plugin = plugin;
		this.apiName = "GoogleBooksAPI";
		this.apiDescription = "Google Books API for searching books";
		this.apiUrl = "https://www.googleapis.com/books/v1";
		this.types = [MediaType.Book];
	}

	private cleanDescription(plot: string): string {
		if (!plot) return "";
		// Convert HTML to plain text
		const tempDiv = document.createElement("div");
		tempDiv.innerHTML = plot;
		return (tempDiv.textContent || tempDiv.innerText || "").trim();
	}

	private processCategories(categories?: string[]): string[] {
		if (!categories || categories.length === 0) return [];

		// Split categories by slashes and flatten
		const flattenedCategories = categories.flatMap((category) =>
			category.split("/").map((part) => part.trim()),
		);

		// Remove duplicates first
		const uniqueCategories = [...new Set(flattenedCategories)];

		// Remove categories that are part of other category names
		return uniqueCategories.filter((category) => {
			// Skip this category if it's a part of any other category name
			// but not if it's exactly the same as another category
			return !uniqueCategories.some(
				(otherCategory) =>
					otherCategory !== category && // not the same category
					otherCategory.toLowerCase().includes(category.toLowerCase()), // is part of other category name
			);
		});
	}

	private getBestImageUrl(
		imageLinks?: GoogleBooksSearchResult["volumeInfo"]["imageLinks"],
		forSearch = false,
	): string | undefined {
		if (!imageLinks) return undefined;

		const imageUrl = forSearch
			? imageLinks.thumbnail
			: imageLinks.extraLarge ||
				imageLinks.large ||
				imageLinks.medium ||
				imageLinks.small ||
				imageLinks.thumbnail;

		if (!imageUrl) return undefined;

		// Ensure HTTPS is used
		return imageUrl.replace(/^http:/, "https:");
	}

	private groupEditions(results: MediaTypeModel[]): GroupedEdition[] {
		const groups = new Map<string, GroupedEdition>();

		for (const result of results) {
			// Use the main title (without subtitle) as the grouping key
			const mainTitle = result.title.split(":")[0].trim();

			if (!groups.has(mainTitle)) {
				groups.set(mainTitle, {
					mainTitle,
					editions: [],
				});
			}

			const group = groups.get(mainTitle);
			if (group) {
				group.editions.push(result);
			}
		}

		// Sort editions within each group by year
		for (const group of groups.values()) {
			group.editions.sort((a, b) => {
				const yearA = Number.parseInt(a.year) || 0;
				const yearB = Number.parseInt(b.year) || 0;
				return yearB - yearA; // Most recent first
			});
		}

		return Array.from(groups.values());
	}

	private getISBN(
		identifiers?: GoogleBooksIndustryIdentifier[],
	): string | undefined {
		if (!identifiers) return undefined;
		const isbn13 = identifiers.find((id) => id.type === "ISBN_13");
		return isbn13?.identifier;
	}

	private mapVolumeInfoToBook(
		info: GoogleBooksVolumeInfo,
		id?: string,
	): BookModel {
		// Get categories from volumeInfo.categories and process them
		const categories = this.processCategories(info.categories);

		// Get ISBN from volumeInfo.industryIdentifiers
		const isbn13 = this.getISBN(info.industryIdentifiers);

		// Get best image URL
		const imageUrl = this.getBestImageUrl(info.imageLinks);

		// Get year from publishedDate
		const year = info.publishedDate
			? Number.parseInt(info.publishedDate.substring(0, 4))
			: undefined;

		return new BookModel({
			title: info.title,
			englishTitle: info.title + (info.subtitle ? `: ${info.subtitle}` : ""),
			author: info.authors?.[0] ?? "unknown",
			description: this.cleanDescription(info.description ?? ""),
			pages: info.pageCount ?? 0,
			image: imageUrl ?? "",
			onlineRating: info.averageRating ?? 0,
			isbn13: isbn13 ?? "",
			genres: categories,
			publishers: info.publisher ? [info.publisher] : [],
			year: year?.toString(),
			dataSource: this.apiName,
			url: info.canonicalVolumeLink ?? "",
			id: id ?? "",
		});
	}

	async searchByTitle(title: string): Promise<MediaTypeModel[]> {
		console.log(`MDB | api "${this.apiName}" queried by Title`);

		const searchUrl = `${this.apiUrl}/volumes?q=${encodeURIComponent(title)}&maxResults=20&langRestrict=en&projection=full`;
		const fetchData = await fetch(searchUrl);

		if (fetchData.status !== 200) {
			throw Error(
				`MDB | Received status code ${fetchData.status} from ${this.apiName}.`,
			);
		}

		const data = await fetchData.json();
		const ret: MediaTypeModel[] = [];

		if (!data.items) {
			return ret;
		}

		for (const result of data.items as GoogleBooksSearchResult[]) {
			const info = result.volumeInfo;

			// Skip non-English books
			if (info.language !== "en") {
				continue;
			}

			ret.push(this.mapVolumeInfoToBook(info, result.id));
		}

		// Group editions and flatten back to array
		const groupedEditions = this.groupEditions(ret);
		return groupedEditions.flatMap((group) => group.editions);
	}

	async getById(id: string): Promise<MediaTypeModel> {
		console.log(`MDB | api "${this.apiName}" queried by ID`);

		const searchUrl = `${this.apiUrl}/volumes/${encodeURIComponent(id)}`;
		const fetchData = await fetch(searchUrl);

		if (fetchData.status !== 200) {
			throw Error(
				`MDB | Received status code ${fetchData.status} from ${this.apiName}.`,
			);
		}

		const result = (await fetchData.json()) as GoogleBooksSearchResult;
		const info = result.volumeInfo;

		return this.mapVolumeInfoToBook(info, result.id);
	}
}
