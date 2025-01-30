import { BookModel } from "src/models/BookModel";
import type MediaDbPlugin from "../../main";
import type { MediaTypeModel } from "../../models/MediaTypeModel";
import { MediaType } from "../../utils/MediaType";
import { APIModel } from "../APIModel";

interface GoogleBooksImageLinks {
	thumbnail?: string;
	smallThumbnail?: string;
	small?: string;
	medium?: string;
	large?: string;
	extraLarge?: string;
}

interface GoogleBooksVolumeInfo {
	title: string;
	subtitle?: string;
	authors?: string[];
	publishedDate?: string;
	description?: string;
	industryIdentifiers?: Array<{
		type: string;
		identifier: string;
	}>;
	pageCount?: number;
	categories?: string[];
	averageRating?: number;
	imageLinks?: GoogleBooksImageLinks;
	language?: string;
	publisher?: string;
	printType?: string;
	seriesInfo?: {
		title: string;
	};
}

interface GoogleBooksSearchResult {
	id: string;
	volumeInfo: GoogleBooksVolumeInfo;
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

	private cleanPlot(plot: string): string {
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

	private getEditionInfo(info: GoogleBooksSearchResult["volumeInfo"]): string {
		const parts: string[] = [];
		if (info.printType) parts.push(info.printType);
		if (info.language) parts.push(`Language: ${info.language}`);
		if (info.pageCount) parts.push(`Pages: ${info.pageCount}`);
		return parts.join(", ");
	}

	private getFormattedUrl(id: string, title: string): string {
		return `https://books.google.com/books?id=${id}&title=${encodeURIComponent(title)}`;
	}

	private getBestImageUrl(
		imageLinks?: GoogleBooksSearchResult["volumeInfo"]["imageLinks"],
	): string | undefined {
		if (!imageLinks) return undefined;
		return (
			imageLinks.extraLarge ||
			imageLinks.large ||
			imageLinks.medium ||
			imageLinks.small ||
			imageLinks.thumbnail ||
			imageLinks.smallThumbnail
		);
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

	async searchByTitle(title: string): Promise<MediaTypeModel[]> {
		console.log(`MDB | api "${this.apiName}" queried by Title`);

		const searchUrl = `${this.apiUrl}/volumes?q=${encodeURIComponent(title)}&maxResults=20&langRestrict=en`;
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

			// Skip non-English books and non-books
			if (
				info.language !== "en" ||
				(info.printType && info.printType !== "BOOK")
			) {
				continue;
			}

			const isbn =
				info.industryIdentifiers?.find((id) => id.type === "ISBN_10")
					?.identifier ?? "";
			const isbn13 =
				info.industryIdentifiers?.find((id) => id.type === "ISBN_13")
					?.identifier ?? "";
			const year = info.publishedDate ? info.publishedDate.substring(0, 4) : "";

			ret.push(
				new BookModel({
					title: info.title + (info.subtitle ? `: ${info.subtitle}` : ""),
					englishTitle: info.title,
					year: year,
					dataSource: this.apiName,
					id: result.id,
					url: this.getFormattedUrl(result.id, info.title),
					author: info.authors?.[0] ?? "unknown",
					plot: this.cleanPlot(info.description ?? ""),
					pages: info.pageCount ?? 0,
					onlineRating: info.averageRating ?? 0,
					image: this.getBestImageUrl(info.imageLinks) ?? "",
					isbn: isbn,
					isbn13: isbn13,
					genres: this.processCategories(info.categories),
					publishers: info.publisher ? [info.publisher] : [],
					series: info.seriesInfo?.title ? [info.seriesInfo.title] : [],
					released: true,
					userData: {
						read: false,
						lastRead: "",
						personalRating: 0,
					},
					editionInfo: this.getEditionInfo(info),
				}),
			);
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
		const isbn =
			info.industryIdentifiers?.find((id) => id.type === "ISBN_10")
				?.identifier ?? "";
		const isbn13 =
			info.industryIdentifiers?.find((id) => id.type === "ISBN_13")
				?.identifier ?? "";
		const year = info.publishedDate ? info.publishedDate.substring(0, 4) : "";

		return new BookModel({
			title: info.title,
			englishTitle: info.title,
			year: year,
			dataSource: this.apiName,
			url: this.getFormattedUrl(result.id, info.title),
			id: result.id,
			author: info.authors?.[0] ?? "unknown",
			plot: this.cleanPlot(info.description ?? ""),
			pages: info.pageCount ?? 0,
			onlineRating: info.averageRating ?? 0,
			image: this.getBestImageUrl(info.imageLinks) ?? "",
			isbn: isbn,
			isbn13: isbn13,
			genres: this.processCategories(info.categories),
			publishers: info.publisher ? [info.publisher] : [],
			series: info.seriesInfo?.title ? [info.seriesInfo.title] : [],
			released: true,
			userData: {
				read: false,
				lastRead: "",
				personalRating: 0,
			},
		});
	}
}
