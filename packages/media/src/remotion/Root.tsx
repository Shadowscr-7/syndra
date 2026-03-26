import React from 'react';
import { Composition, registerRoot } from 'remotion';
import { VideoComposition } from './VideoComposition';

export const RemotionRoot: React.FC = () => {
  return (
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
  );
};

registerRoot(RemotionRoot);
