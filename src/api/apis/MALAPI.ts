import type MediaDbPlugin from "../../main";
import { AnimeModel } from "../../models/AnimeModel";
import type { MediaTypeModel } from "../../models/MediaTypeModel";
import { MediaType } from "../../utils/MediaType";
import { APIModel } from "../APIModel";

interface MALGenre {
	name: string;
}

interface MALStudio {
	name: string;
}

export class MALAPI extends APIModel {
	plugin: MediaDbPlugin;
	typeMappings: Map<string, string>;
	apiDateFormat = "YYYY-MM-DDTHH:mm:ssZ"; // ISO

	constructor(plugin: MediaDbPlugin) {
		super();

		this.plugin = plugin;
		this.apiName = "MALAPI";
		this.apiDescription =
			"A free API for Anime. Some results may take a long time to load.";
		this.apiUrl = "https://jikan.moe/";
		this.types = [MediaType.Anime];
		this.typeMappings = new Map<string, string>();
		this.typeMappings.set("movie", "movie");
		this.typeMappings.set("special", "special");
		this.typeMappings.set("tv", "series");
		this.typeMappings.set("ova", "ova");
	}

	async searchByTitle(title: string): Promise<MediaTypeModel[]> {
		console.log(`MDB | api "${this.apiName}" queried by Title`);

		const searchUrl = `https://api.jikan.moe/v4/anime?q=${encodeURIComponent(title)}&limit=20${this.plugin.settings.sfwFilter ? "&sfw" : ""}`;

		const fetchData = await fetch(searchUrl);
		if (fetchData.status !== 200) {
			throw Error(
				`MDB | Received status code ${fetchData.status} from ${this.apiName}.`,
			);
		}
		const data = await fetchData.json();

		const ret: MediaTypeModel[] = [];

		for (const result of data.data) {
			ret.push(
				new AnimeModel({
					id: result.mal_id.toString(),
					dataSource: this.apiName,
					title: result.title,
					url: result.url || "",
					description: result.synopsis || "",
					genres: result.genres?.map((x: MALGenre) => x.name) || [],
					year: (
						result.year ??
						result.aired?.prop?.from?.year ??
						""
					).toString(),
					rating: result.score?.toString() || "",
					episodes: result.episodes || 0,
					status: result.status || "",
					studios: result.studios?.map((x: MALStudio) => x.name) || [],
					imageUrl:
						result.images?.jpg?.large_image_url ||
						result.images?.jpg?.image_url ||
						"",
					duration: result.duration || "",
					airedFrom:
						this.plugin.dateFormatter.format(
							result.aired?.from,
							this.apiDateFormat,
						) || "",
					airedTo:
						this.plugin.dateFormatter.format(
							result.aired?.to,
							this.apiDateFormat,
						) || "",
					airing: result.airing || false,
				}),
			);
		}

		return ret;
	}

	async getById(id: string): Promise<MediaTypeModel> {
		console.log(`MDB | api "${this.apiName}" queried by ID`);

		const searchUrl = `https://api.jikan.moe/v4/anime/${encodeURIComponent(id)}/full`;
		const fetchData = await fetch(searchUrl);

		if (fetchData.status !== 200) {
			throw Error(
				`MDB | Received status code ${fetchData.status} from ${this.apiName}.`,
			);
		}

		const data = await fetchData.json();
		const result = data.data;

		return new AnimeModel({
			id: result.mal_id.toString(),
			dataSource: this.apiName,
			title: result.title,
			url: result.url || "",
			description: result.synopsis || "",
			genres: result.genres?.map((x: MALGenre) => x.name) || [],
			year: (result.year ?? result.aired?.prop?.from?.year ?? "").toString(),
			rating: result.score?.toString() || "",
			episodes: result.episodes || 0,
			status: result.status || "",
			studios: result.studios?.map((x: MALStudio) => x.name) || [],
			imageUrl:
				result.images?.jpg?.large_image_url ||
				result.images?.jpg?.image_url ||
				"",
			duration: result.duration || "",
			airedFrom:
				this.plugin.dateFormatter.format(
					result.aired?.from,
					this.apiDateFormat,
				) || "",
			airedTo:
				this.plugin.dateFormatter.format(
					result.aired?.to,
					this.apiDateFormat,
				) || "",
			airing: result.airing || false,
		});
	}
}
