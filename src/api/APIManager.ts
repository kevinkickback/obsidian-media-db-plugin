import {APIModel} from './APIModel';
import {MediaTypeModel} from '../models/MediaTypeModel';

export class APIManager {
	apis: APIModel[];

	constructor() {
		this.apis = [];
	}

	async query(query: string, types: string[] = []): Promise<MediaTypeModel[]> {
		console.log('MDB | api manager queried');

		let res: MediaTypeModel[] = [];

		for (const api of this.apis) {
			if (types.length === 0 || api.hasTypeOverlap(types)) {
				const apiRes = await api.getByTitle(query);
				// console.log(apiRes);
				res = res.concat(apiRes);
			}
		}

		return res;
	}

	registerAPI(api: APIModel): void {
		this.apis.push(api);
	}
}
