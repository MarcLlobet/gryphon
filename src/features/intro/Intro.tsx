"use client";

/**
 * The boot sequence. It sits over the map while the map loads underneath it, and it
 * cannot finish before the map is ready: the animation holds until every boot
 * milestone is in (or a maximum wait passes), then dives into the thermal eye and
 * fades away over a map that is already interactive.
 *
 * Shown once per browser session. Add `#intro` to the URL to see it again.
 */
import { useCallback, useEffect, useRef, useState, useSyncExternalStore, type CSSProperties } from "react";
import { GryphonPatch } from "@/components/GryphonPatch";
import { patchPlacement } from "@/components/gryphonArt";
import { BOOT_TASKS } from "@/features/boot/boot";
import { useBootSnapshot } from "@/features/boot/BootProvider";
import { artPlacement, finalFov, type Placement } from "./asterism";
import type { IntroScene } from "./IntroScene";
import { MAX_WAIT_SECONDS, type IntroPhase } from "./timeline";
import styles from "./Intro.module.css";

export const INTRO_SEEN_KEY = "gryphon:intro-seen";
const FADE_OUT_MS = 700;
const REDUCED_MOTION = "(prefers-reduced-motion: reduce)";

const alreadySeen = (): boolean => {
  try {
    return window.sessionStorage.getItem(INTRO_SEEN_KEY) === "1" && !window.location.hash.includes("intro");
  } catch {
    return false;
  }
};

const rememberSeen = (): void => {
  try {
    window.sessionStorage.setItem(INTRO_SEEN_KEY, "1");
  } catch {
    // Private mode or blocked storage: the intro simply shows again next time.
  }
};

const prefersReducedMotion = (): boolean => window.matchMedia?.(REDUCED_MOTION)?.matches ?? false;

const subscribeToMotion = (onChange: () => void) => {
  const query = window.matchMedia?.(REDUCED_MOTION);
  query?.addEventListener?.("change", onChange);
  return () => query?.removeEventListener?.("change", onChange);
};

const noSubscription = () => () => {};

/** Where the patch sits in the still frame: the same place the stars would land. */
const stillPlacement = (): Placement =>
  artPlacement(window.innerWidth, window.innerHeight, finalFov(window.innerWidth / window.innerHeight));

const formatSeconds = (ms: number | undefined): string => (ms === undefined ? "" : `${(ms / 1000).toFixed(2)} s`);

export const Intro = () => {
  const snapshot = useBootSnapshot();
  // Browser-only facts, read as external stores: the static render assumes "not
  // seen" and "motion allowed", and the client corrects it right after hydration.
  const seen = useSyncExternalStore(noSubscription, alreadySeen, () => false);
  /** Reduced motion: a still frame, and Three.js is never downloaded. */
  const still = useSyncExternalStore(subscribeToMotion, prefersReducedMotion, () => false);

  const [done, setDone] = useState(false);
  const [leaving, setLeaving] = useState(false);
  const [scenePhase, setScenePhase] = useState<IntroPhase>("warp");
  const [placement, setPlacement] = useState<Placement | null>(null);

  const rootRef = useRef<HTMLElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const sceneRef = useRef<IntroScene | null>(null);
  const readyRef = useRef(snapshot.ready);

  const finish = useCallback(() => {
    setLeaving(true);
    window.setTimeout(() => {
      // The intro stays mounted (it renders nothing once done), so free the GPU here
      // rather than waiting for an unmount that may never come.
      sceneRef.current?.dispose();
      sceneRef.current = null;
      rememberSeen();
      setDone(true);
    }, FADE_OUT_MS);
  }, []);

  useEffect(() => {
    if (alreadySeen()) {
      return;
    }

    if (still) {
      const place = () => setPlacement(stillPlacement());
      window.addEventListener("resize", place);
      // Never wait longer than the animated intro would.
      const cap = window.setTimeout(finish, MAX_WAIT_SECONDS * 1000);
      return () => {
        window.removeEventListener("resize", place);
        window.clearTimeout(cap);
      };
    }

    let cancelled = false;

    void import("./IntroScene").then(({ IntroScene }) => {
      const canvas = canvasRef.current;
      if (cancelled || canvas === null) {
        return;
      }
      try {
        const scene = new IntroScene(canvas, {
          reducedMotion: false,
          callbacks: {
            onPhase: (phase) => {
              setScenePhase(phase);
              if (phase === "done") finish();
            },
            onPlacement: setPlacement,
            // Per-frame values go straight to CSS, never through React state.
            onDive: (progress) => rootRef.current?.style.setProperty("--dive", progress.toFixed(3)),
            // A lost WebGL context or a failing frame: never block the map, just leave.
            onError: () => finish(),
          },
        });
        scene.setReady(readyRef.current);
        scene.start();
        sceneRef.current = scene;
      } catch {
        // No WebGL: go straight to the map.
        finish();
      }
    });

    const onResize = () => sceneRef.current?.resize();
    window.addEventListener("resize", onResize);

    return () => {
      cancelled = true;
      window.removeEventListener("resize", onResize);
      sceneRef.current?.dispose();
      sceneRef.current = null;
    };
  }, [finish, still]);

  useEffect(() => {
    readyRef.current = snapshot.ready;
    sceneRef.current?.setReady(snapshot.ready);
  }, [snapshot.ready]);

  // The still frame ends as soon as the map is ready, after a moment to read the patch.
  useEffect(() => {
    if (!still || !snapshot.ready) {
      return;
    }
    const timer = window.setTimeout(finish, 600);
    return () => window.clearTimeout(timer);
  }, [still, snapshot.ready, finish]);

  if (seen || done) {
    return null;
  }

  const phase: IntroPhase = still ? "logo" : scenePhase;
  const shownPlacement = placement ?? (still ? stillPlacement() : null);
  const patch = shownPlacement ? patchPlacement(shownPlacement) : null;
  const patchStyle: CSSProperties | undefined = patch
    ? { transform: `translate(${patch.tx}px, ${patch.ty}px) scale(${patch.scale})` }
    : undefined;
  const percent = Math.round(snapshot.progress * 100);

  return (
    <section
      ref={rootRef}
      className={styles.root}
      data-phase={phase}
      data-leaving={leaving || undefined}
      data-still={still || undefined}
      aria-label="Gryphon is loading"
      aria-busy={!snapshot.ready}
    >
      {!still && <canvas ref={canvasRef} className={styles.canvas} aria-hidden="true" />}

      {patch && (
        <div className={styles.patch} style={patchStyle}>
          <GryphonPatch size={200} />
        </div>
      )}

      <p className={styles.target} aria-hidden="true">
        TARGET · GRYPHON ASTERISM
        <br />
        NEAR AQUILA · <span>ALTAIR</span>
        <br />
        RA 19h 50m 47s · DEC +08° 52′ 06″
      </p>

      <div className={styles.boot}>
        <p className={styles.bootHead}>
          <span>PRELOADING MAP</span>
          <span>{percent}%</span>
        </p>
        <div className={styles.bar} aria-hidden="true">
          <i style={{ width: `${percent}%` }} />
        </div>
        <ol className={styles.tasks}>
          {BOOT_TASKS.map((task) => {
            const at = snapshot.completedAt[task.id];
            return (
              <li key={task.id} data-done={at !== undefined || undefined}>
                <span>{task.label}</span>
                <span>{at === undefined ? "loading" : formatSeconds(at)}</span>
              </li>
            );
          })}
        </ol>
      </div>

      <button
        type="button"
        className={styles.skip}
        onClick={() => (sceneRef.current ? sceneRef.current.skip() : finish())}
      >
        Skip intro
      </button>

      <div className={styles.flash} aria-hidden="true" />
    </section>
  );
};
