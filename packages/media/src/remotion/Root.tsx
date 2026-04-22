import React from 'react';
import { Composition, registerRoot } from 'remotion';
import { VideoComposition } from './VideoComposition';
import { CarouselComposition } from './CarouselComposition';

export const RemotionRoot: React.FC = () => {
  return (
    <>
      <Composition
        id="VideoCompositor"
        component={VideoComposition}
        durationInFrames={300}
        fps={30}
        width={1080}
        height={1920}
        defaultProps={{
          slides: [],
          musicVolume: 0.25,
          subtitleGroups: [],
          subtitleStyle: 'pill',
          overlayTheme: 'modern',
        }}
      />
      <Composition
        id="CarouselComposition"
        component={CarouselComposition}
        durationInFrames={270}
        fps={30}
        width={1080}
        height={1080}
        defaultProps={{
          slides: [],
          framesPerSlide: 90,
          palette: 'tech-azul',
          handle: '@syndra',
          techGrid: true,
          particles: true,
          musicVolume: 0.22,
        }}
      />
    </>
  );
};

registerRoot(RemotionRoot);
