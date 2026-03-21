function PaperTextureDefs() {
  return (
    <svg
      aria-hidden="true"
      className="pointer-events-none absolute h-0 w-0 overflow-hidden"
      focusable="false"
      xmlns="http://www.w3.org/2000/svg"
    >
      <filter id="paperFilter" x="0%" y="0%" width="100%" height="100%">
        <feTurbulence
          type="fractalNoise"
          baseFrequency="0.8"
          result="noise"
          numOctaves="5"
        />
        <feDiffuseLighting
          in="noise"
          lightingColor="white"
          surfaceScale="2"
        >
          <feDistantLight azimuth="45" elevation="60" />
        </feDiffuseLighting>
      </filter>
    </svg>
  );
}

export default PaperTextureDefs;
