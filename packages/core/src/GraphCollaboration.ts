import type { GraphAnnotation, GraphBookmark, OrbitGraphViewState } from "./types";

/** In-memory, serializable collaboration state. Persist it in the host app to collaborate in real time. */
export class GraphCollaborationStore {
    private annotations = new Map<string, GraphAnnotation>();
    private bookmarks = new Map<string, GraphBookmark>();

    upsertAnnotation(annotation: GraphAnnotation): void { this.annotations.set(annotation.id, { ...annotation }); }
    removeAnnotation(id: string): void { this.annotations.delete(id); }
    getAnnotations(): GraphAnnotation[] { return [...this.annotations.values()].map((item) => ({ ...item })); }
    saveBookmark(bookmark: GraphBookmark): void { this.bookmarks.set(bookmark.id, { ...bookmark, view: structuredClone(bookmark.view) }); }
    removeBookmark(id: string): void { this.bookmarks.delete(id); }
    getBookmarks(): GraphBookmark[] { return [...this.bookmarks.values()].map((item) => ({ ...item, view: structuredClone(item.view) })); }
    createBookmark(id: string, name: string, view: OrbitGraphViewState): GraphBookmark {
        const bookmark = { id, name, view: structuredClone(view), createdAt: new Date().toISOString() };
        this.saveBookmark(bookmark);
        return bookmark;
    }
    export(): { annotations: GraphAnnotation[]; bookmarks: GraphBookmark[] } { return { annotations: this.getAnnotations(), bookmarks: this.getBookmarks() }; }
    import(state: { annotations?: GraphAnnotation[]; bookmarks?: GraphBookmark[] }): void {
        state.annotations?.forEach((annotation) => this.upsertAnnotation(annotation));
        state.bookmarks?.forEach((bookmark) => this.saveBookmark(bookmark));
    }
}
