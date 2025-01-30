import { Notice } from "obsidian";
import { requestUrl } from "obsidian";
import type MediaDbPlugin from "../../main";
import { GameModel } from "../../models/GameModel";
import type { MediaTypeModel } from "../../models/MediaTypeModel";
import { MediaType } from "../../utils/MediaType";
import { APIModel } from "../APIModel";

export class MobyGamesAPI extends APIModel {
	plugin: MediaDbPlugin;
	apiDateFormat: string = "YYYY-DD-MM";

	constructor(plugin: MediaDbPlugin) {
		super();

		this.plugin = plugin;
		this.apiName = "MobyGamesAPI";
		this.apiDescription = "A free API for games.";
		this.apiUrl = "https://api.mobygames.com/v1";
		this.types = [MediaType.Game];
	}
	async searchByTitle(title: string): Promise<MediaTypeModel[]> {
		console.log(`MDB | api "${this.apiName}" queried by Title`);

		// Since we no longer support MobyGames API key in settings, return empty results
		return [];
	}

	async getById(id: string): Promise<MediaTypeModel> {
		console.log(`MDB | api "${this.apiName}" queried by ID`);

		// Since we no longer support MobyGames API key in settings, throw an error
		throw Error(`MDB | ${this.apiName} is no longer supported.`);
	}
}
