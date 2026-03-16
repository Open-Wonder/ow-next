'use client';

import { Sparkle } from '@phosphor-icons/react';
import { useState } from 'react';
import AspectRatioSelector from '@/components/common/AspectRatioSelector';
import Box from '@/components/common/Box';
import { Button } from '@/components/common/Button';
import QuantityControl from '@/components/common/QuantityControl';
import Textarea from '@/components/common/Textarea';
import type { ImageFormat } from '@/lib/config/imageFormats';
import { DEFAULT_FORMAT_IMAGE_CREATION } from '@/lib/config/imageFormats';
import styles from './PromptInput.module.css';

interface PromptInputProps {
  onGenerate?: (
    prompt: string,
    aspectRatio: string,
    quantity: number
  ) => void;
}

export default function PromptInput({ onGenerate }: PromptInputProps) {
  const [prompt, setPrompt] = useState('');
  const [selectedFormat, setSelectedFormat] = useState<ImageFormat>(
    DEFAULT_FORMAT_IMAGE_CREATION
  );
  const [quantity, setQuantity] = useState(1);

  const handleGenerate = () => {
    if (prompt.trim()) {
      onGenerate?.(prompt, selectedFormat.aspectRatio, quantity);
    }
  };

  return (
    <Box variant="white" className={styles.wrapper}>
      <Textarea
        id="prompt-input"
        value={prompt}
        rows={2}
        onChange={(e) => setPrompt(e.target.value)}
        className={styles.textarea}
        autoResize
        placeholder="Describe the image you want to generate…"
        onEnterPress={handleGenerate}
      />

      <div className={styles.controls}>
        <div className={styles.controlGroup}>
          <AspectRatioSelector
            value={selectedFormat.id}
            onChange={setSelectedFormat}
            type="create"
            size="sm"
          />

          <QuantityControl
            min={1}
            max={10}
            value={quantity}
            onChange={setQuantity}
            className={styles.quantityControl}
            suffix="Variants"
          />
        </div>

        <Button
          variant="primary"
          size="sm"
          disabled={!prompt.trim()}
          onClick={handleGenerate}
          icon={<Sparkle size={16} />}
        >
          Create Image
        </Button>
      </div>
    </Box>
  );
}
