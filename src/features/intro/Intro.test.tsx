import { act, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { BootProvider } from "@/features/boot/BootProvider";
import type { IntroOptions } from "./IntroScene";
import { Intro, INTRO_SEEN_KEY } from "./Intro";

// jsdom has no WebGL: the scene is replaced by a recording fake.
const scenes = vi.hoisted(
  () =>
    [] as Array<{
      options: IntroOptions;
      setReady: ReturnType<typeof vi.fn>;
      skip: ReturnType<typeof vi.fn>;
      dispose: ReturnType<typeof vi.fn>;
    }>,
);

vi.mock("./IntroScene", () => ({
  IntroScene: class {
    options: IntroOptions;
    setReady = vi.fn();
    skip = vi.fn();
    dispose = vi.fn();
    start = vi.fn();
    resize = vi.fn();
    constructor(_canvas: HTMLCanvasElement, options: IntroOptions) {
      this.options = options;
      scenes.push(this as never);
    }
  },
}));

const renderIntro = () =>
  render(
    <BootProvider>
      <Intro />
    </BootProvider>,
  );

const currentScene = async () => {
  await waitFor(() => expect(scenes).toHaveLength(1));
  return scenes[0]!;
};

describe("Intro", () => {
  beforeEach(() => {
    scenes.length = 0;
    window.sessionStorage.clear();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("covers the map with the boot readout while loading", async () => {
    renderIntro();

    expect(screen.getByRole("region", { name: /gryphon is loading/i })).toHaveAttribute("aria-busy", "true");
    expect(screen.getByText("Basemap style · fonts")).toBeInTheDocument();
    expect(screen.getByText("0%")).toBeInTheDocument();
    await currentScene();
  });

  it("tells the scene the app is not ready yet", async () => {
    renderIntro();

    const scene = await currentScene();
    expect(scene.setReady).toHaveBeenCalledWith(false);
  });

  it("skips to the reveal on request", async () => {
    renderIntro();
    const scene = await currentScene();

    await userEvent.click(screen.getByRole("button", { name: /skip intro/i }));

    expect(scene.skip).toHaveBeenCalled();
  });

  it("lays the patch over the stars once the scene reports where they land", async () => {
    renderIntro();
    const scene = await currentScene();

    act(() => scene.options.callbacks.onPlacement?.({ scale: 2, tx: 100, ty: 50 }));

    expect(screen.getByRole("img", { name: "Gryphon" })).toBeInTheDocument();
  });

  it("fades out, remembers it was seen and frees the GPU when done", async () => {
    renderIntro();
    const scene = await currentScene();

    act(() => scene.options.callbacks.onPhase?.("done"));

    await waitFor(() => expect(screen.queryByRole("region", { name: /gryphon is loading/i })).not.toBeInTheDocument());
    expect(window.sessionStorage.getItem(INTRO_SEEN_KEY)).toBe("1");
    expect(scene.dispose).toHaveBeenCalled();
  });

  it("does not show again in the same session", async () => {
    window.sessionStorage.setItem(INTRO_SEEN_KEY, "1");

    renderIntro();

    await waitFor(() => expect(screen.queryByRole("region", { name: /gryphon is loading/i })).not.toBeInTheDocument());
    expect(scenes).toHaveLength(0);
  });

  it("shows a still frame without loading the 3D scene when motion is reduced", async () => {
    const original = window.matchMedia;
    window.matchMedia = ((query: string) => ({ matches: query.includes("reduce") })) as typeof window.matchMedia;
    try {
      renderIntro();

      expect(await screen.findByRole("img", { name: "Gryphon" })).toBeInTheDocument();
      expect(scenes).toHaveLength(0);
    } finally {
      window.matchMedia = original;
    }
  });

  it("gets out of the way when the scene fails", async () => {
    renderIntro();
    const scene = await currentScene();

    act(() => scene.options.callbacks.onError?.(new Error("context lost")));

    await waitFor(() => expect(screen.queryByRole("region", { name: /gryphon is loading/i })).not.toBeInTheDocument());
  });
});
