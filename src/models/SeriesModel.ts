import { MediaType } from "../utils/MediaType";
import type { ModelToData } from "../utils/Utils";
import { mediaDbTag, migrateObject } from "../utils/Utils";
import { MediaTypeModel } from "./MediaTypeModel";

export type SeriesData = ModelToData<SeriesModel>;

export class SeriesModel extends MediaTypeModel {
	plot: string;
	genres: string[];
	writer: string[];
	studio: string[];
	episodes: number;
	seasons: number;
	duration: string;
	onlineRating: number;
	actors: string[];
	image: string;

	released: boolean;
	streamingServices: string[];
	airing: boolean;
	airedFrom: string;
	airedTo: string;

	userData: {
		watched: boolean;
		lastWatched: string;
		personalRating: number;
	};

	constructor(obj: SeriesData) {
		super();

		this.plot = "";
		this.genres = [];
		this.writer = [];
		this.studio = [];
		this.episodes = 0;
		this.seasons = 0;
		this.duration = "";
		this.onlineRating = 0;
		this.actors = [];
		this.image = "";

		this.released = false;
		this.streamingServices = [];
		this.airing = false;
		this.airedFrom = "";
		this.airedTo = "";

		this.userData = {
			watched: false,
			lastWatched: "",
			personalRating: 0,
		};

		migrateObject(this, obj, this);

		if (!Object.prototype.hasOwnProperty.call(obj, "userData")) {
			migrateObject(this.userData, obj, this.userData);
		}

		this.type = this.getMediaType();
	}

	getTags(): string[] {
		return [mediaDbTag, "tv", "series"];
	}

	getMediaType(): MediaType {
		return MediaType.Series;
	}

	getSummary(): string {
		const seasonInfo = this.seasons ? ` (${this.seasons} seasons)` : "";
		const durationInfo = this.duration ? ` - ${this.duration}` : "";
		return `(${this.year})${seasonInfo}${durationInfo}`;
	}

	getWithOutUserData(): Record<string, unknown> {
		return {
			id: this.id,
			type: this.type,
			subType: this.subType,
			title: this.title,
			englishTitle: this.englishTitle,
			year: this.year,
			dataSource: this.dataSource,
			url: this.url,
			plot: this.plot,
			genres: this.genres,
			writer: this.writer,
			studio: this.studio,
			episodes: this.episodes,
			seasons: this.seasons,
			duration: this.duration,
			onlineRating: this.onlineRating,
			actors: this.actors,
			image: this.image,
			released: this.released,
			streamingServices: this.streamingServices,
			airing: this.airing,
			airedFrom: this.airedFrom,
			airedTo: this.airedTo,
		};
	}
}
