type Quality = {
  width: number;
  height: number;
  size: string;
};

export const ASPECT_RATIO_OPTIONS_CREATE = [
  { value: '16:9' as const, label: '16:9', factor: 16 / 9 },
  { value: '1:1' as const, label: '1:1', factor: 1 / 1 },
  { value: '4:5' as const, label: '4:5', factor: 4 / 5 },
] as const;

export const ASPECT_RATIO_OPTIONS_MODIFY = [
  { value: 'auto' as const, label: 'Auto', factor: 0 },
  { value: '16:9' as const, label: '16:9', factor: 16 / 9 },
  { value: '1:1' as const, label: '1:1', factor: 1 / 1 },
  { value: '4:5' as const, label: '4:5', factor: 4 / 5 },
] as const;

export const ASPECT_RATIO_OPTIONS_ILLUSTRATION = [
  { value: '16:9' as const, label: '16:9', factor: 16 / 9 },
  { value: '1:1' as const, label: '1:1', factor: 1 / 1 },
  { value: '4:5' as const, label: '4:5', factor: 4 / 5 },
] as const;

export const QUALITY_OPTIONS = [
  { value: 'low' as const, label: 'Low (Definition max. 1024)', maxLength: 1024 },
  { value: 'sd' as const, label: 'SD (Standard Definition max. 1536)', maxLength: 1536 },
  { value: 'hd' as const, label: 'HD (High Definition max. 1920)', maxLength: 1920 },
] as const;

export type QualityLevel = (typeof QUALITY_OPTIONS)[number]['value'];

export type ImageFormat = {
  id: string;
  label: string;
  aspectRatio: string;
  qualities: {
    [QUALITY_LEVEL in QualityLevel]: Quality;
  };
};

type AspectRatioOption = {
  value: string;
  label: string;
  factor: number;
};

function getQualityByAspectRatio(
  aspectRatio: number,
  maxLength: number
): Quality {
  const isLandscape = aspectRatio >= 1;

  if (isLandscape) {
    const width = maxLength;
    const height = Math.round(maxLength / aspectRatio);
    return {
      width,
      height,
      size: `${width}x${height}`,
    };
  } else {
    const height = maxLength;
    const width = Math.round(maxLength * aspectRatio);
    return {
      width,
      height,
      size: `${width}x${height}`,
    };
  }
}

function generateImageFormatsFromAspectRatios(
  aspectRatioOptions: readonly AspectRatioOption[]
): ImageFormat[] {
  return aspectRatioOptions.map((option) => {
    const hdMaxLength =
      option.value === '1:1' ? 1440 : QUALITY_OPTIONS[2].maxLength;
    const format: ImageFormat = {
      id: option.value,
      label: option.label,
      aspectRatio: option.value,
      qualities: {
        [QUALITY_OPTIONS[0].value]: getQualityByAspectRatio(
          option.factor,
          QUALITY_OPTIONS[0].maxLength
        ),
        [QUALITY_OPTIONS[1].value]: getQualityByAspectRatio(
          option.factor,
          QUALITY_OPTIONS[1].maxLength
        ),
        [QUALITY_OPTIONS[2].value]: getQualityByAspectRatio(
          option.factor,
          hdMaxLength
        ),
      },
    };
    return format;
  });
}

export const IMAGE_FORMATS_IMAGE_CREATION: ImageFormat[] =
  generateImageFormatsFromAspectRatios(ASPECT_RATIO_OPTIONS_CREATE);

export const IMAGE_FORMATS_IMAGE_MODIFY: ImageFormat[] =
  generateImageFormatsFromAspectRatios(ASPECT_RATIO_OPTIONS_MODIFY);

export const IMAGE_FORMATS_IMAGE_ILLUSTRATION: ImageFormat[] =
  generateImageFormatsFromAspectRatios(ASPECT_RATIO_OPTIONS_ILLUSTRATION);

export const DEFAULT_FORMAT_IMAGE_CREATION = IMAGE_FORMATS_IMAGE_CREATION[0];
export const DEFAULT_FORMAT_IMAGE_MODIFY = IMAGE_FORMATS_IMAGE_MODIFY[0];
export const DEFAULT_FORMAT_IMAGE_ILLUSTRATION =
  IMAGE_FORMATS_IMAGE_ILLUSTRATION[0];
export const DEFAULT_QUALITY_MODIFY = QUALITY_OPTIONS[0].value;
export const DEFAULT_QUALITY_CREATION = QUALITY_OPTIONS[0].value;

export function getFormatWidth(
  format: ImageFormat,
  quality: QualityLevel = 'low'
): number {
  if (format.qualities) {
    return format.qualities[quality].width;
  }
  return 0;
}

export function getFormatHeight(
  format: ImageFormat,
  quality: QualityLevel = 'low'
): number {
  if (format.qualities) {
    return format.qualities[quality].height;
  }
  return 0;
}

export function getFormatSize(
  format: ImageFormat,
  quality: QualityLevel = 'low'
): string {
  if (format.qualities) {
    return format.qualities[quality].size;
  }
  return '0x0';
}

export function getFormatByDimensions(
  width: number | null | undefined,
  height: number | null | undefined,
  defaultFormat: ImageFormat,
  formats: ImageFormat[]
): ImageFormat {
  if (!width || !height) {
    return defaultFormat;
  }

  const aspectRatio = width / height;

  let closestFormat = defaultFormat;
  let minDifference = 0.1;

  for (const format of formats) {
    const formatWidth = getFormatWidth(format, 'low');
    const formatHeight = getFormatHeight(format, 'low');
    const formatAspectRatio =
      formatHeight === 0 ? 0 : formatWidth / formatHeight;
    const difference = Math.abs(aspectRatio - formatAspectRatio);
    if (difference < minDifference) {
      minDifference = difference;
      closestFormat = format;
    }
  }

  return closestFormat;
}
