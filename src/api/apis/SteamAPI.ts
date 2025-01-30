import { requestUrl } from "obsidian";
import type MediaDbPlugin from "../../main";
import { GameModel } from "../../models/GameModel";
import type { MediaTypeModel } from "../../models/MediaTypeModel";
import { MediaType } from "../../utils/MediaType";
import { APIModel } from "../APIModel";

interface SteamSearchResult {
	name: string;
	appid: string;
}

interface SteamGenre {
	description: string;
}

interface SteamGameDetails {
	name: string;
	steam_appid: string;
	detailed_description: string;
	short_description: string;
	header_image: string;
	developers: string[];
	publishers: string[];
	genres: SteamGenre[];
	metacritic?: { score: string };
	release_date: {
		date: string;
		comming_soon: boolean;
	};
}

export class SteamAPI extends APIModel {
	plugin: MediaDbPlugin;
	typeMappings = new Map<string, string>();
	apiDateFormat = "DD MMM, YYYY";

	constructor(plugin: MediaDbPlugin) {
		super();

		this.plugin = plugin;
		this.apiName = "SteamAPI";
		this.apiDescription = "A free API for all Steam games.";
		this.apiUrl = "https://www.steampowered.com/";
		this.types = [MediaType.Game];
		this.typeMappings.set("game", "game");
	}

	async searchByTitle(title: string): Promise<MediaTypeModel[]> {
		console.log(`MDB | api "${this.apiName}" queried by Title`);

		const searchUrl = `https://steamcommunity.com/actions/SearchApps/${encodeURIComponent(title)}`;
		const fetchData = await requestUrl({
			url: searchUrl,
		});

		if (fetchData.status !== 200) {
			throw Error(
				`MDB | Received status code ${fetchData.status} from ${this.apiName}.`,
			);
		}

		const data = await fetchData.json;
		const ret: MediaTypeModel[] = [];

		for (const result of data as SteamSearchResult[]) {
			ret.push(
				new GameModel({
					type: MediaType.Game,
					title: result.name,
					englishTitle: result.name,
					year: "",
					dataSource: this.apiName,
					id: result.appid,
				}),
			);
		}

		return ret;
	}

	async getById(id: string): Promise<MediaTypeModel> {
		console.log(`MDB | api "${this.apiName}" queried by ID`);

		const searchUrl = `https://store.steampowered.com/api/appdetails?appids=${encodeURIComponent(id)}&l=en`;
		const fetchData = await requestUrl({
			url: searchUrl,
		});

		if (fetchData.status !== 200) {
			throw Error(
				`MDB | Received status code ${fetchData.status} from ${this.apiName}.`,
			);
		}

		const data = await fetchData.json;
		let result: SteamGameDetails | undefined;

		for (const [key, value] of Object.entries(data)) {
			if (key === String(id)) {
				result = (value as { data: SteamGameDetails }).data;
			}
		}

		if (!result) {
			throw Error("MDB | API returned invalid data.");
		}

		return new GameModel({
			type: MediaType.Game,
			title: result.name,
			englishTitle: result.name,
			year: new Date(result.release_date.date).getFullYear().toString(),
			dataSource: this.apiName,
			url: `https://store.steampowered.com/app/${result.steam_appid}`,
			id: result.steam_appid,

			developers: result.developers,
			publishers: result.publishers,
			genres: result.genres?.map((x) => x.description) ?? [],
			onlineRating: Number.parseFloat(result.metacritic?.score ?? "0"),
			image: result.header_image ?? "",
			plot: result.short_description ?? "",
			series: [],

			released: !result.release_date.comming_soon,
			releaseDate:
				this.plugin.dateFormatter.format(
					result.release_date.date,
					this.apiDateFormat,
				) ?? "unknown",

			userData: {
				played: false,
				personalRating: 0,
			},
		});
	}
}
