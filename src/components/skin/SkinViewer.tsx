import React from 'react';
import { ReactSkinview3d as SkinView3d } from 'react-skinview3d';
import { IdleAnimation } from 'skinview3d';

interface SkinViewerProps {
  skinUrl: string;
  capeUrl?: string;
  width?: number;
  height?: number;
  model?: 'classic' | 'slim';
}

export const SkinViewer: React.FC<SkinViewerProps> = ({
  skinUrl,
  capeUrl,
  width = 300,
  height = 400,
  model = 'classic',
}) => {
  return (
    <div className="rounded-lg overflow-hidden border border-border bg-card/50 shadow-sm flex items-center justify-center">
      <SkinView3d
        skinUrl={skinUrl}
        // @ts-ignore
        capeUrl={capeUrl}
        height={height}
        width={width}
        // @ts-ignore
        model={model}
        onReady={(instance) => {
          // @ts-ignore - SkinView3d types might be incomplete
          if (instance.animation === undefined || instance.animation === null) {
            // @ts-ignore
            instance.animation = new IdleAnimation();
          }
        }}
      />
    </div>
  );
};
