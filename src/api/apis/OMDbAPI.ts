import { Notice } from "obsidian";
import type MediaDbPlugin from "../../main";
import { GameModel } from "../../models/GameModel";
import type { MediaTypeModel } from "../../models/MediaTypeModel";
import { MovieModel } from "../../models/MovieModel";
import { SeriesModel } from "../../models/SeriesModel";
import { MediaType } from "../../utils/MediaType";
import { APIModel } from "../APIModel";

export class OMDbAPI extends APIModel {
	plugin: MediaDbPlugin;
	typeMappings: Map<string, string>;
	apiDateFormat: string = "DD MMM YYYY";

	constructor(plugin: MediaDbPlugin) {
		super();

		this.plugin = plugin;
		this.apiName = "OMDbAPI";
		this.apiDescription = "A free API for Movies, Series and Games.";
		this.apiUrl = "https://www.omdbapi.com/";
		this.types = [MediaType.Movie, MediaType.Series, MediaType.Game];
		this.typeMappings = new Map<string, string>();
		this.typeMappings.set("movie", "movie");
		this.typeMappings.set("series", "series");
		this.typeMappings.set("game", "game");
	}

	async searchByTitle(title: string): Promise<MediaTypeModel[]> {
		console.log(`MDB | api "${this.apiName}" queried by Title`);

		if (!this.plugin.settings.OMDbKey) {
			throw new Error(`MDB | API key for ${this.apiName} missing.`);
		}

		const searchUrl = `https://www.omdbapi.com/?s=${encodeURIComponent(title)}&apikey=${this.plugin.settings.OMDbKey}`;
		const fetchData = await fetch(searchUrl);

		if (fetchData.status === 401) {
			throw Error(
				`MDB | Authentication for ${this.apiName} failed. Check the API key.`,
			);
		}
		if (fetchData.status !== 200) {
			throw Error(
				`MDB | Received status code ${fetchData.status} from ${this.apiName}.`,
			);
		}

		const data = await fetchData.json();

		if (data.Response === "False") {
			if (data.Error === "Movie not found!") {
				return [];
			}

			throw Error(
				`MDB | Received error from ${this.apiName}: \n${JSON.stringify(data, undefined, 4)}`,
			);
		}
		if (!data.Search) {
			return [];
		}

		// console.debug(data.Search);

		const ret: MediaTypeModel[] = [];

		for (const result of data.Search) {
			const type = this.typeMappings.get(result.Type.toLowerCase());
			if (type === undefined) {
				continue;
			}
			if (type === "movie") {
				ret.push(
					new MovieModel({
						type: type,
						title: result.Title,
						englishTitle: result.Title,
						year: result.Year,
						dataSource: this.apiName,
						id: result.imdbID,
						image: result.Poster ?? "",
					}),
				);
			} else if (type === "series") {
				ret.push(
					new SeriesModel({
						type: type,
						title: result.Title,
						englishTitle: result.Title,
						year: result.Year,
						dataSource: this.apiName,
						id: result.imdbID,
						image: result.Poster ?? "",
					}),
				);
			} else if (type === "game") {
				ret.push(
					new GameModel({
						type: type,
						title: result.Title,
						englishTitle: result.Title,
						year: result.Year,
						dataSource: this.apiName,
						id: result.imdbID,
						image: result.Poster ?? "",
					}),
				);
			}
		}

		return ret;
	}

	async getById(id: string): Promise<MediaTypeModel> {
		console.log(`MDB | api "${this.apiName}" queried by ID`);

		if (!this.plugin.settings.OMDbKey) {
			throw Error(`MDB | API key for ${this.apiName} missing.`);
		}

		const searchUrl = `https://www.omdbapi.com/?i=${encodeURIComponent(id)}&apikey=${this.plugin.settings.OMDbKey}`;
		const fetchData = await fetch(searchUrl);

		if (fetchData.status === 401) {
			throw Error(
				`MDB | Authentication for ${this.apiName} failed. Check the API key.`,
			);
		}
		if (fetchData.status !== 200) {
			throw Error(
				`MDB | Received status code ${fetchData.status} from ${this.apiName}.`,
			);
		}

		const result = await fetchData.json();
		// console.debug(result);

		if (result.Response === "False") {
			throw Error(`MDB | Received error from ${this.apiName}: ${result.Error}`);
		}

		const type = this.typeMappings.get(result.Type.toLowerCase());
		if (type === undefined) {
			throw Error(`${result.type.toLowerCase()} is an unsupported type.`);
		}

		if (type === "movie") {
			return new MovieModel({
				type: type,
				title: result.Title,
				englishTitle: result.Title,
				year: result.Year,
				dataSource: this.apiName,
				url: `https://www.imdb.com/title/${result.imdbID}/`,
				id: result.imdbID,

				plot: result.Plot ?? "",
				genres: result.Genre?.split(", ") ?? [],
				director: result.Director?.split(", ") ?? [],
				writer: result.Writer?.split(", ") ?? [],
				studio: ["N/A"],
				duration: result.Runtime ?? "unknown",
				onlineRating: Number.parseFloat(result.imdbRating ?? 0),
				actors: result.Actors?.split(", ") ?? [],
				image: result.Poster ?? "",

				released: true,
				streamingServices: [],
				premiere:
					this.plugin.dateFormatter.format(
						result.Released,
						this.apiDateFormat,
					) ?? "unknown",

				userData: {
					watched: false,
					lastWatched: "",
					personalRating: 0,
				},
			});
		} else if (type === "series") {
			return new SeriesModel({
				type: type,
				title: result.Title,
				englishTitle: result.Title,
				year: result.Year,
				dataSource: this.apiName,
				url: `https://www.imdb.com/title/${result.imdbID}/`,
				id: result.imdbID,

				plot: result.Plot ?? "",
				genres: result.Genre?.split(", ") ?? [],
				writer: result.Writer?.split(", ") ?? [],
				studio: [],
				episodes: 0,
				seasons: Number.parseInt(result.totalSeasons ?? "0"),
				duration: result.Runtime ?? "unknown",
				onlineRating: Number.parseFloat(result.imdbRating ?? 0),
				actors: result.Actors?.split(", ") ?? [],
				image: result.Poster ?? "",

				released: true,
				streamingServices: [],
				airing: false,
				airedFrom:
					this.plugin.dateFormatter.format(
						result.Released,
						this.apiDateFormat,
					) ?? "unknown",
				airedTo: "unknown",

				userData: {
					watched: false,
					lastWatched: "",
					personalRating: 0,
				},
			});
		} else if (type === "game") {
			return new GameModel({
				type: type,
				title: result.Title,
				englishTitle: result.Title,
				year: result.Year,
				dataSource: this.apiName,
				url: `https://www.imdb.com/title/${result.imdbID}/`,
				id: result.imdbID,

				developers: [],
				publishers: [],
				genres: result.Genre?.split(", ") ?? [],
				onlineRating: Number.parseFloat(result.imdbRating ?? 0),
				image: result.Poster ?? "",

				released: true,
				releaseDate:
					this.plugin.dateFormatter.format(
						result.Released,
						this.apiDateFormat,
					) ?? "unknown",

				userData: {
					played: false,
					personalRating: 0,
				},
			});
		}

		throw new Error(`MDB | Unknown media type for id ${id}`);
	}
}
