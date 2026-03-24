import { useRef, useState } from "react";

import { useMountEffect } from "../../../../hooks/useMountEffect";

interface UsePlaybackStateOptions {
  delayMs: number;
  maxIndex: number;
}

export function usePlaybackState({
  delayMs,
  maxIndex,
}: UsePlaybackStateOptions) {
  const [current, setCurrentState] = useState(0);
  const [isPlaying, setIsPlayingState] = useState(false);
  const currentRef = useRef(current);
  const isPlayingRef = useRef(isPlaying);
  const maxIndexRef = useRef(maxIndex);
  const delayRef = useRef(delayMs);
  const timeoutRef = useRef<number | null>(null);

  currentRef.current = current;
  isPlayingRef.current = isPlaying;
  maxIndexRef.current = maxIndex;
  delayRef.current = delayMs;

  function clearPlaybackTimeout(): void {
    if (timeoutRef.current === null) {
      return;
    }

    window.clearTimeout(timeoutRef.current);
    timeoutRef.current = null;
  }

  function stopPlayback(): void {
    clearPlaybackTimeout();

    if (!isPlayingRef.current) {
      return;
    }

    isPlayingRef.current = false;
    setIsPlayingState(false);
  }

  function setCurrent(nextValue: number): void {
    const clamped = Math.min(Math.max(nextValue, 0), maxIndexRef.current);
    currentRef.current = clamped;
    setCurrentState(clamped);
  }

  function queueNextPlaybackStep(): void {
    clearPlaybackTimeout();

    if (!isPlayingRef.current) {
      return;
    }

    if (currentRef.current >= maxIndexRef.current) {
      stopPlayback();
      return;
    }

    timeoutRef.current = window.setTimeout(() => {
      if (!isPlayingRef.current) {
        return;
      }

      const nextIndex = Math.min(currentRef.current + 1, maxIndexRef.current);
      currentRef.current = nextIndex;
      setCurrentState(nextIndex);

      if (nextIndex >= maxIndexRef.current) {
        stopPlayback();
        return;
      }

      queueNextPlaybackStep();
    }, delayRef.current);
  }

  function togglePlayback(): void {
    if (isPlayingRef.current) {
      stopPlayback();
      return;
    }

    if (currentRef.current >= maxIndexRef.current) {
      currentRef.current = 0;
      setCurrentState(0);
    }

    isPlayingRef.current = true;
    setIsPlayingState(true);
    queueNextPlaybackStep();
  }

  function goPrev(): void {
    stopPlayback();
    setCurrent(currentRef.current - 1);
  }

  function goNext(): void {
    stopPlayback();
    setCurrent(currentRef.current + 1);
  }

  useMountEffect(() => {
    return () => {
      clearPlaybackTimeout();
    };
  });

  return {
    current,
    goNext,
    goPrev,
    isPlaying,
    setCurrent,
    stopPlayback,
    togglePlayback,
  };
}
