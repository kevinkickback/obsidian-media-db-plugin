import { MediaType } from "../utils/MediaType";
import type { ModelToData } from "../utils/Utils";
import { mediaDbTag, migrateObject } from "../utils/Utils";
import { MediaTypeModel } from "./MediaTypeModel";

export type BookData = ModelToData<BookModel>;

export class BookModel extends MediaTypeModel {
	author: string;
	plot: string;
	pages: number;
	image: string;
	onlineRating: number;
	isbn: string;
	isbn13: string;
	genres: string[];
	publishers: string[];
	series: string[];
	editionInfo: string;

	released: boolean;

	userData: {
		read: boolean;
		lastRead: string;
		personalRating: number;
	};

	constructor(obj: BookData) {
		super();

		this.author = "";
		this.plot = "";
		this.pages = 0;
		this.image = "";
		this.onlineRating = 0;
		this.isbn = "";
		this.isbn13 = "";
		this.genres = [];
		this.publishers = [];
		this.series = [];
		this.editionInfo = "";

		this.released = false;

		this.userData = {
			read: false,
			lastRead: "",
			personalRating: 0,
		};

		migrateObject(this, obj, this);

		if (!Object.prototype.hasOwnProperty.call(obj, "userData")) {
			migrateObject(this.userData, obj, this.userData);
		}

		this.type = this.getMediaType();
	}

	getTags(): string[] {
		return [mediaDbTag, "book"];
	}

	getMediaType(): MediaType {
		return MediaType.Book;
	}

	getSummary(): string {
		return `${this.englishTitle} (${this.year}) - ${this.author}`;
	}
}
