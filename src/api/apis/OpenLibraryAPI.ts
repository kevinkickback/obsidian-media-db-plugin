import { BookModel } from "src/models/BookModel";
import type MediaDbPlugin from "../../main";
import type { MediaTypeModel } from "../../models/MediaTypeModel";
import { MediaType } from "../../utils/MediaType";
import { APIModel } from "../APIModel";

interface OpenLibrarySearchResult {
	title: string;
	title_english?: string;
	first_publish_year?: number;
	key: string;
	author_name?: string[];
	isbn?: string[];
	number_of_pages_median?: number;
	ratings_average?: number;
	cover_edition_key?: string;
	description?: string;
	subject?: string[];
	publisher?: string[];
	series?: string[];
}

export class OpenLibraryAPI extends APIModel {
	plugin: MediaDbPlugin;

	constructor(plugin: MediaDbPlugin) {
		super();

		this.plugin = plugin;
		this.apiName = "OpenLibraryAPI";
		this.apiDescription = "A free API for books";
		this.apiUrl = "https://openlibrary.org/";
		this.types = [MediaType.Book];
	}

	async searchByTitle(title: string): Promise<MediaTypeModel[]> {
		console.log(`MDB | api "${this.apiName}" queried by Title`);

		const searchUrl = `https://openlibrary.org/search.json?title=${encodeURIComponent(title)}&fields=title,title_english,first_publish_year,key,author_name,isbn,number_of_pages_median,ratings_average,cover_edition_key,description,subject,publisher,series`;

		const fetchData = await fetch(searchUrl);
		if (fetchData.status !== 200) {
			throw Error(
				`MDB | Received status code ${fetchData.status} from ${this.apiName}.`,
			);
		}
		const data = await fetchData.json();
		const ret: MediaTypeModel[] = [];

		for (const result of data.docs as OpenLibrarySearchResult[]) {
			ret.push(
				new BookModel({
					title: result.title,
					englishTitle: result.title_english ?? result.title,
					year: result.first_publish_year?.toString() ?? "",
					dataSource: this.apiName,
					id: result.key,
					author: result.author_name?.[0] ?? "unknown",
					isbn: result.isbn?.find((el) => el.length <= 10) ?? "",
					isbn13: result.isbn?.find((el) => el.length === 13) ?? "",
					pages: result.number_of_pages_median ?? 0,
					onlineRating: Number.parseFloat(
						Number(result.ratings_average ?? 0).toFixed(2),
					),
					image: result.cover_edition_key
						? `https://covers.openlibrary.org/b/OLID/${result.cover_edition_key}-L.jpg`
						: "",
					plot: result.description ?? "",
					genres: result.subject ?? [],
					publishers: result.publisher ?? [],
					series: result.series ?? [],
					released: true,
					userData: {
						read: false,
						lastRead: "",
						personalRating: 0,
					},
				}),
			);
		}

		return ret;
	}

	async getById(id: string): Promise<MediaTypeModel> {
		console.log(`MDB | api "${this.apiName}" queried by ID`);

		const searchUrl = `https://openlibrary.org/search.json?q=key:${encodeURIComponent(id)}&fields=title,title_english,first_publish_year,key,author_name,isbn,number_of_pages_median,ratings_average,cover_edition_key,description,subject,publisher,series`;
		const fetchData = await fetch(searchUrl);

		if (fetchData.status !== 200) {
			throw Error(
				`MDB | Received status code ${fetchData.status} from ${this.apiName}.`,
			);
		}

		const data = await fetchData.json();
		const result = data.docs[0] as OpenLibrarySearchResult;

		if (!result) {
			throw Error(`MDB | Book not found with ID ${id}`);
		}

		return new BookModel({
			title: result.title,
			englishTitle: result.title_english ?? result.title,
			year: result.first_publish_year?.toString() ?? "",
			dataSource: this.apiName,
			url: `https://openlibrary.org${result.key}`,
			id: result.key,
			author: result.author_name?.[0] ?? "unknown",
			isbn: result.isbn?.find((el) => el.length <= 10) ?? "",
			isbn13: result.isbn?.find((el) => el.length === 13) ?? "",
			pages: result.number_of_pages_median ?? 0,
			onlineRating: Number.parseFloat(
				Number(result.ratings_average ?? 0).toFixed(2),
			),
			image: result.cover_edition_key
				? `https://covers.openlibrary.org/b/OLID/${result.cover_edition_key}-L.jpg`
				: "",
			plot: result.description ?? "",
			genres: result.subject ?? [],
			publishers: result.publisher ?? [],
			series: result.series ?? [],
			released: true,
			userData: {
				read: false,
				lastRead: "",
				personalRating: 0,
			},
		});
	}
}
