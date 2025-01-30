import { MediaType } from "../utils/MediaType";
import { MediaTypeModel } from "./MediaTypeModel";

interface AnimeData {
	id: string;
	dataSource: string;
	title: string;
	url: string;
	description?: string;
	genres?: string[];
	year: string;
	rating?: string;
	episodes?: number;
	status?: string;
	studios?: string[];
	imageUrl?: string;
	duration?: string;
	airedFrom?: string;
	airedTo?: string;
	airing?: boolean;
}

export class AnimeModel extends MediaTypeModel {
	description?: string;
	genres?: string[];
	rating?: string;
	episodes?: number;
	status?: string;
	studios?: string[];
	imageUrl?: string;
	duration?: string;
	airedFrom?: string;
	airedTo?: string;
	airing?: boolean;

	constructor(obj: AnimeData) {
		super();
		this.type = MediaType.Anime;
		this.id = obj.id;
		this.dataSource = obj.dataSource;
		this.title = obj.title;
		this.url = obj.url;
		this.year = obj.year;
		this.description = obj.description;
		this.genres = obj.genres;
		this.rating = obj.rating;
		this.episodes = obj.episodes;
		this.status = obj.status;
		this.studios = obj.studios;
		this.imageUrl = obj.imageUrl;
		this.duration = obj.duration;
		this.airedFrom = obj.airedFrom;
		this.airedTo = obj.airedTo;
		this.airing = obj.airing;
	}

	getMediaType(): MediaType {
		return MediaType.Anime;
	}

	getSummary(): string {
		return `${this.genres}` || "";
	}

	getTags(): string[] {
		return this.genres || [];
	}

	getWithOutUserData(): Record<string, unknown> {
		return {
			id: this.id,
			type: this.type,
			dataSource: this.dataSource,
			title: this.title,
			url: this.url,
			year: this.year,
			description: this.description,
			genres: this.genres,
			rating: this.rating,
			episodes: this.episodes,
			status: this.status,
			studios: this.studios,
			imageUrl: this.imageUrl,
			duration: this.duration,
			airedFrom: this.airedFrom,
			airedTo: this.airedTo,
			airing: this.airing,
		};
	}
}
