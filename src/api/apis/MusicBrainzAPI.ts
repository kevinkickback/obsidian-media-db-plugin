import { requestUrl } from "obsidian";
import type MediaDbPlugin from "../../main";
import type { MediaTypeModel } from "../../models/MediaTypeModel";
import { MusicReleaseModel } from "../../models/MusicReleaseModel";
import { MediaType } from "../../utils/MediaType";
import { contactEmail, mediaDbVersion, pluginName } from "../../utils/Utils";
import { APIModel } from "../APIModel";

interface MusicBrainzArtist {
	name: string;
}

interface MusicBrainzGenre {
	name: string;
}

interface MusicBrainzLabel {
	name: string;
}

interface MusicBrainzLabelInfo {
	label: MusicBrainzLabel;
}

interface MusicBrainzTrack {
	length: number;
}

interface MusicBrainzMedia {
	tracks: MusicBrainzTrack[];
}

interface MusicBrainzRelease {
	"label-info": MusicBrainzLabelInfo[];
	media: MusicBrainzMedia[];
}

export class MusicBrainzAPI extends APIModel {
	plugin: MediaDbPlugin;

	constructor(plugin: MediaDbPlugin) {
		super();

		this.plugin = plugin;
		this.apiName = "MusicBrainz API";
		this.apiDescription = "Free API for music albums.";
		this.apiUrl = "https://musicbrainz.org/";
		this.types = [MediaType.MusicRelease];
	}

	async searchByTitle(title: string): Promise<MediaTypeModel[]> {
		console.log(`MDB | api "${this.apiName}" queried by Title`);

		const searchUrl = `https://musicbrainz.org/ws/2/release-group?query=${encodeURIComponent(title)}&limit=20&fmt=json`;

		const fetchData = await requestUrl({
			url: searchUrl,
			headers: {
				"User-Agent": `${pluginName}/${mediaDbVersion} (${contactEmail})`,
			},
		});

		if (fetchData.status !== 200) {
			throw Error(
				`MDB | Received status code ${fetchData.status} from ${this.apiName}.`,
			);
		}

		const data = await fetchData.json;
		const ret: MediaTypeModel[] = [];

		for (const result of data["release-groups"]) {
			ret.push(
				new MusicReleaseModel({
					type: "musicRelease",
					title: result.title,
					englishTitle: result.title,
					year: new Date(result["first-release-date"]).getFullYear().toString(),
					dataSource: this.apiName,
					url: `https://musicbrainz.org/release-group/${result.id}`,
					id: result.id,
					image: `https://coverartarchive.org/release-group/${result.id}/front`,
					artists: result["artist-credit"].map(
						(a: MusicBrainzArtist) => a.name,
					),
					subType: result["primary-type"],
					label: "", // Will be populated in getById
					duration: "", // Will be populated in getById
				}),
			);
		}

		return ret;
	}

	async getById(id: string): Promise<MediaTypeModel> {
		console.log(`MDB | api "${this.apiName}" queried by ID`);

		// First get the release group info with genres and ratings
		const searchUrl = `https://musicbrainz.org/ws/2/release-group/${encodeURIComponent(id)}?inc=artist-credits+ratings+genres+releases&fmt=json`;
		const fetchData = await requestUrl({
			url: searchUrl,
			headers: {
				"User-Agent": `${pluginName}/${mediaDbVersion} (${contactEmail})`,
			},
		});

		if (fetchData.status !== 200) {
			throw Error(
				`MDB | Received status code ${fetchData.status} from ${this.apiName}.`,
			);
		}

		const result = await fetchData.json;

		// Then get the first release info to get label and duration
		let label = "";
		let duration = "";
		try {
			// If we have releases in the result, get the first release ID
			if (result.releases && result.releases.length > 0) {
				const releaseId = result.releases[0].id;
				const releaseSearchUrl = `https://musicbrainz.org/ws/2/release/${encodeURIComponent(releaseId)}?inc=labels+recordings&fmt=json`;
				const releaseData = await requestUrl({
					url: releaseSearchUrl,
					headers: {
						"User-Agent": `${pluginName}/${mediaDbVersion} (${contactEmail})`,
					},
				});

				if (releaseData.status === 200) {
					const release = await releaseData.json;
					if (release["label-info"] && release["label-info"].length > 0) {
						label = release["label-info"][0].label.name;
					}
					// Get total duration from all recordings
					if (release.media && release.media.length > 0) {
						const totalLength = release.media
							.flatMap((media: MusicBrainzMedia) => media.tracks || [])
							.reduce(
								(total: number, track: MusicBrainzTrack) =>
									total + (track.length || 0),
								0,
							);
						if (totalLength > 0) {
							const minutes = Math.floor(totalLength / 60000);
							const seconds = Math.floor((totalLength % 60000) / 1000);
							duration = `${minutes}:${seconds.toString().padStart(2, "0")}`;
						}
					}
				}
			}
		} catch (error) {
			console.log("MDB | Failed to fetch release info:", error);
			// Continue without label and duration if the second request fails
		}

		return new MusicReleaseModel({
			type: "musicRelease",
			title: result.title,
			englishTitle: result.title,
			year: new Date(result["first-release-date"]).getFullYear().toString(),
			dataSource: this.apiName,
			url: `https://musicbrainz.org/release-group/${result.id}`,
			id: result.id,
			image: `https://coverartarchive.org/release-group/${result.id}/front`,
			artists: result["artist-credit"].map((a: MusicBrainzArtist) => a.name),
			genres: result.genres?.map((g: MusicBrainzGenre) => g.name) ?? [],
			subType: result["primary-type"],
			rating: result.rating?.value ? result.rating.value * 2 : 0,
			label: label,
			duration: duration,
			userData: {
				personalRating: 0,
			},
		});
	}
}
