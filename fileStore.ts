export class FileStore {
  private static file: File | null = null;
  private static previewUrl: string | null = null;
  private static youtubeUrl: string | null = null;

  static setFile(file: File) {
    this.file = file;
    this.youtubeUrl = null;
    // Revoke old URL if it exists
    if (this.previewUrl) {
      URL.revokeObjectURL(this.previewUrl);
    }
    this.previewUrl = URL.createObjectURL(file);
  }

  static setYoutubeUrl(url: string) {
    this.youtubeUrl = url;
    this.file = null;
    if (this.previewUrl) {
      URL.revokeObjectURL(this.previewUrl);
      this.previewUrl = null;
    }
  }

  static getFile() {
    return this.file;
  }

  static getYoutubeUrl() {
    return this.youtubeUrl;
  }

  static getPreviewUrl() {
    return this.previewUrl;
  }

  static clearFile() {
    this.file = null;
    this.youtubeUrl = null;
    // Don't revoke immediately so it can be used on ResultsPage
    // We'll clear it when navigating away from ResultsPage or on new upload
  }

  static revokePreview() {
    if (this.previewUrl) {
      URL.revokeObjectURL(this.previewUrl);
      this.previewUrl = null;
    }
  }
}
