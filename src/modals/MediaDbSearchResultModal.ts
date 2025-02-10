import type MediaDbPlugin from "../main";
import type { MediaTypeModel } from "../models/MediaTypeModel";
import type { SelectModalData, SelectModalOptions } from "../utils/ModalHelper";
import { SELECT_MODAL_OPTIONS_DEFAULT } from "../utils/ModalHelper";
import { SelectModal } from "./SelectModal";
import type { BookModel } from "../models/BookModel";
import type { MovieModel } from "../models/MovieModel";
import type { SeriesModel } from "../models/SeriesModel";
import type { GameModel } from "../models/GameModel";
import type { MusicReleaseModel } from "../models/MusicReleaseModel";
import type { AnimeModel } from "../models/AnimeModel";
import type { MangaModel } from "../models/MangaModel";
import type { BoardGameModel } from "../models/BoardGameModel";

export class MediaDbSearchResultModal extends SelectModal<MediaTypeModel> {
	plugin: MediaDbPlugin;

	busy: boolean;
	sendCallback: boolean;

	submitCallback?: (res: SelectModalData) => void;
	closeCallback?: (err?: Error) => void;
	skipCallback?: () => void;

	constructor(plugin: MediaDbPlugin, selectModalOptions: SelectModalOptions) {
		const mergedOptions = Object.assign(
			{},
			SELECT_MODAL_OPTIONS_DEFAULT,
			selectModalOptions,
		);
		super(plugin.app, mergedOptions.elements ?? [], mergedOptions.multiSelect);
		this.plugin = plugin;

		this.title = mergedOptions.modalTitle ?? "";
		this.description = "Select one or multiple search results.";
		this.addSkipButton = mergedOptions.skipButton ?? false;

		this.busy = false;

		this.sendCallback = false;
	}

	setSubmitCallback(submitCallback: (res: SelectModalData) => void): void {
		this.submitCallback = submitCallback;
	}

	setCloseCallback(closeCallback: (err?: Error) => void): void {
		this.closeCallback = closeCallback;
	}

	setSkipCallback(skipCallback: () => void): void {
		this.skipCallback = skipCallback;
	}

	// Renders each suggestion item.
	renderElement(item: MediaTypeModel, el: HTMLElement): void {
		const container = el.createDiv({
			cls: "media-db-plugin-result-container",
			attr: { "data-type": item.type },
		});

		// Create image container
		const imageContainer = container.createDiv({
			cls: "media-db-plugin-result-image",
		});

		// Get image based on media type
		let imageUrl: string | undefined;
		switch (item.type) {
			case "book":
				imageUrl = (item as BookModel).image;
				break;
			case "movie":
				imageUrl = (item as MovieModel).image;
				break;
			case "series":
				imageUrl = (item as SeriesModel).image;
				break;
			case "game":
				imageUrl = (item as GameModel).image;
				break;
			case "musicRelease":
				imageUrl = (item as MusicReleaseModel).image;
				break;
			case "anime":
				imageUrl = (item as AnimeModel).imageUrl;
				break;
			case "manga":
				imageUrl = (item as MangaModel).image;
				break;
			case "boardgame":
				imageUrl = (item as BoardGameModel).image;
				break;
		}

		// Add image if available, otherwise show placeholder
		if (imageUrl) {
			const imgElement = imageContainer.createEl("img", {
				cls: "media-db-plugin-result-img",
			});
			imgElement.src = imageUrl;
			imgElement.alt = item.title;
		} else {
			// Fallback to type icon if no image
			const icon = imageContainer.createEl("span", {
				cls: "media-db-plugin-result-icon-inner",
			});
			icon.setAttribute("aria-label", item.type);
			switch (item.type) {
				case "book":
					icon.addClass("lucide-book-open");
					break;
				case "movie":
					icon.addClass("lucide-film");
					break;
				case "series":
					icon.addClass("lucide-tv");
					break;
				case "game":
					icon.addClass("lucide-gamepad-2");
					break;
				case "musicRelease":
					icon.addClass("lucide-music");
					break;
				case "wiki":
					icon.addClass("lucide-file-text");
					break;
				default:
					icon.addClass("lucide-help-circle");
			}
		}

		// Create content container
		const content = container.createDiv({
			cls: "media-db-plugin-result-content",
		});

		content.createEl("div", {
			text: `${item.title}${item.year ? ` (${item.year})` : ""}`,
		});
		content.createEl("small", { text: `${item.getSummary()}\n` });
		content.createEl("small", {
			text: `${item.type.toUpperCase() + (item.subType ? ` (${item.subType})` : "")} from ${item.dataSource}`,
		});
	}

	// Perform action on the selected suggestion.
	submit(): void {
		if (!this.busy) {
			this.busy = true;
			this.submitButton?.setButtonText("Creating entry...");
			this.submitCallback?.({
				selected: this.selectModalElements
					.filter((x) => x.isActive())
					.map((x) => x.value),
			});
		}
	}

	skip(): void {
		this.skipButton?.setButtonText("Skipping...");
		this.skipCallback?.();
	}

	onClose(): void {
		this.closeCallback?.();
	}
}
