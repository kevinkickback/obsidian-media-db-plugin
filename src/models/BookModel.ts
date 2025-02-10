import { MediaType } from "../utils/MediaType";
import type { ModelToData } from "../utils/Utils";
import { mediaDbTag, migrateObject } from "../utils/Utils";
import { MediaTypeModel } from "./MediaTypeModel";

export type BookData = ModelToData<BookModel>;

export class BookModel extends MediaTypeModel {
	author: string;
	description: string;
	pages: number;
	image: string;
	onlineRating: number;
	isbn13: string;
	genres: string[];
	publishers: string[];

	constructor(obj: BookData) {
		super();

		this.author = "";
		this.description = "";
		this.pages = 0;
		this.image = "";
		this.onlineRating = 0;
		this.isbn13 = "";
		this.genres = [];
		this.publishers = [];

		migrateObject(this, obj, this);

		this.type = this.getMediaType();
	}

	getTags(): string[] {
		return [mediaDbTag, "book"];
	}

	getMediaType(): MediaType {
		return MediaType.Book;
	}

	getSummary(): string {
		const parts = [];
		if (this.author) parts.push(`by ${this.author}`);
		return parts.join(" - ");
	}
}
