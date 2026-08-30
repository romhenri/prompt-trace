/**
 * Shared horizontal rhythm.
 *
 * The header, the banner and every page draw their side gutters from here, so
 * they cannot drift apart between routes. Padding grows with the viewport
 * because a gutter that reads as generous at 375px reads as suffocating on a
 * wide monitor.
 */
export const PAGE_GUTTER = "px-4 sm:px-8 lg:px-12 xl:px-20";

/**
 * Full-width pages. The max width stops content sprawling edge to edge on a
 * large display, which is what makes long lines tiring to read.
 */
export const PAGE_CONTAINER = `mx-auto w-full max-w-[88rem] ${PAGE_GUTTER}`;
