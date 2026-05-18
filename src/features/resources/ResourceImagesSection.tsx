import { useEffect, useRef, useState, type DragEvent } from 'react';
import { GripVertical, ImageOff, ImagePlus, Trash2, Upload } from 'lucide-react';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Modal } from '../../components/ui/Modal';
import { ApiError, resourcesApi } from '../../lib/api-client';
import type { ResourceImage } from '../../types';

interface ResourceImagesSectionProps {
  resourceId: string;
  compact?: boolean;
}

interface ResourceImageDraftSectionProps {
  files: File[];
  onChange: (files: File[]) => void;
  disabled?: boolean;
}

const MAX_RESOURCE_IMAGES = 10;

function reorderList<T>(items: T[], fromIndex: number, toIndex: number) {
  if (fromIndex === toIndex || fromIndex < 0 || toIndex < 0) return items;

  const next = [...items];
  const [moved] = next.splice(fromIndex, 1);
  next.splice(toIndex, 0, moved);
  return next;
}

export function ResourceImagesSection({ resourceId, compact = false }: ResourceImagesSectionProps) {
  const [images, setImages] = useState<ResourceImage[]>([]);
  const [imagesLoading, setImagesLoading] = useState(true);
  const [imagesError, setImagesError] = useState('');
  const [uploadOpen, setUploadOpen] = useState(false);
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [uploading, setUploading] = useState(false);

  const loadImages = async () => {
    setImagesLoading(true);
    setImagesError('');
    try {
      const nextImages = await resourcesApi.images.list(resourceId);
      setImages(nextImages.slice().sort((a, b) => a.sortOrder - b.sortOrder));
    } catch (err) {
      setImagesError(err instanceof ApiError ? `Не удалось загрузить изображения: ${err.message}` : 'Не удалось загрузить изображения.');
    } finally {
      setImagesLoading(false);
    }
  };

  useEffect(() => {
    void loadImages();
  }, [resourceId]);

  const handleUpload = async () => {
    if (selectedFiles.length === 0) return;

    setUploading(true);
    setImagesError('');
    try {
      const nextImages = await resourcesApi.images.upload(resourceId, selectedFiles);
      setImages(nextImages.slice().sort((a, b) => a.sortOrder - b.sortOrder));
      setSelectedFiles([]);
      setUploadOpen(false);
    } catch (err) {
      setImagesError(err instanceof ApiError ? `Не удалось загрузить изображения: ${err.message}` : 'Не удалось загрузить изображения.');
    } finally {
      setUploading(false);
    }
  };

  return (
    <Card className={`overflow-hidden ${compact ? 'p-3' : ''}`}>
      <div className="mb-4 flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <ImagePlus size={15} className="text-gray-400" />
          <h3 className="text-sm font-semibold text-gray-900">Изображения</h3>
        </div>
        <Button size="sm" variant="secondary" onClick={() => setUploadOpen(true)}>
          <Upload size={13} /> Загрузить
        </Button>
      </div>

      {imagesLoading ? (
        <div className="flex aspect-video items-center justify-center rounded-md border border-dashed border-gray-200 bg-gray-50 text-sm text-gray-500">
          Загружаем изображения...
        </div>
      ) : images.length === 0 ? (
        <button
          type="button"
          onClick={() => setUploadOpen(true)}
          className="flex aspect-video w-full flex-col items-center justify-center rounded-md border border-dashed border-gray-300 bg-gray-50 text-center transition hover:border-blue-300 hover:bg-blue-50"
        >
          <ImageOff size={28} className="text-gray-400" />
          <span className="mt-2 text-sm font-medium text-gray-700">Добавьте фото позиции</span>
          <span className="mt-1 text-xs text-gray-500">JPEG, PNG или WebP до 5 МБ</span>
        </button>
      ) : (
        <UploadedImageGrid
          images={images}
          onUploadClick={() => setUploadOpen(true)}
          onReorder={(fromIndex, toIndex) => {
            setImages(current =>
              reorderList(current, fromIndex, toIndex).map((image, index) => ({
                ...image,
                sortOrder: index + 1,
              }))
            );
          }}
        />
      )}

      {imagesError && <p className="mt-3 text-xs text-red-600">{imagesError}</p>}

      <Modal open={uploadOpen} onClose={() => !uploading && setUploadOpen(false)} title="Загрузить изображения" size="sm">
        <div className="space-y-4">
          <label className="flex cursor-pointer flex-col items-center justify-center rounded-md border border-dashed border-gray-300 bg-gray-50 px-4 py-8 text-center transition hover:border-blue-300 hover:bg-blue-50">
            <Upload size={22} className="text-gray-400" />
            <span className="mt-2 text-sm font-medium text-gray-800">Выберите изображения</span>
            <span className="mt-1 text-xs text-gray-500">Можно выбрать несколько файлов</span>
            <input
              type="file"
              accept="image/jpeg,image/png,image/webp"
              multiple
              className="sr-only"
              onChange={event => setSelectedFiles(Array.from(event.target.files ?? []))}
            />
          </label>

          {selectedFiles.length > 0 && (
            <div className="space-y-1 rounded-md border border-gray-200 bg-white p-3">
              {selectedFiles.map(file => (
                <div key={`${file.name}-${file.size}`} className="flex items-center justify-between gap-3 text-xs">
                  <span className="truncate text-gray-700">{file.name}</span>
                  <span className="shrink-0 text-gray-500">{(file.size / 1024 / 1024).toFixed(2)} МБ</span>
                </div>
              ))}
            </div>
          )}

          {imagesError && <p className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700">{imagesError}</p>}

          <div className="flex justify-end gap-2">
            <Button variant="secondary" onClick={() => setUploadOpen(false)} disabled={uploading}>Отмена</Button>
            <Button variant="primary" onClick={() => void handleUpload()} loading={uploading} disabled={selectedFiles.length === 0}>
              Загрузить
            </Button>
          </div>
        </div>
      </Modal>
    </Card>
  );
}

export function ResourceImageDraftSection({
  files,
  onChange,
  disabled = false,
}: ResourceImageDraftSectionProps) {
  const [uploadOpen, setUploadOpen] = useState(false);
  const [previews, setPreviews] = useState<Array<{ file: File; url: string }>>([]);

  useEffect(() => {
    const nextPreviews = files.map(file => ({ file, url: URL.createObjectURL(file) }));
    setPreviews(nextPreviews);

    return () => {
      nextPreviews.forEach(preview => URL.revokeObjectURL(preview.url));
    };
  }, [files]);

  const appendFiles = (nextFiles: File[]) => {
    const accepted = nextFiles
      .filter(file => ['image/jpeg', 'image/png', 'image/webp'].includes(file.type))
      .slice(0, Math.max(MAX_RESOURCE_IMAGES - files.length, 0));

    if (accepted.length > 0) onChange([...files, ...accepted]);
  };

  const removeFile = (index: number) => {
    onChange(files.filter((_, fileIndex) => fileIndex !== index));
  };

  const reorderFile = (fromIndex: number, toIndex: number) => {
    onChange(reorderList(files, fromIndex, toIndex));
  };

  return (
    <Card className="overflow-hidden p-3">
      <div className="mb-3 flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <ImagePlus size={15} className="text-gray-400" />
          <h3 className="text-sm font-semibold text-gray-900">Фото</h3>
          <span className="text-xs text-gray-500">{files.length}/{MAX_RESOURCE_IMAGES}</span>
        </div>
        <Button
          type="button"
          size="sm"
          variant="secondary"
          onClick={() => setUploadOpen(true)}
          disabled={disabled || files.length >= MAX_RESOURCE_IMAGES}
        >
          <Upload size={13} /> Добавить
        </Button>
      </div>

      <div className="grid grid-cols-2 gap-2 sm:grid-cols-5">
        {Array.from({ length: MAX_RESOURCE_IMAGES }).map((_, index) => {
          const preview = previews[index];
          const isMain = index === 0;

          if (!preview) {
            return (
              <button
                key={`placeholder-${index}`}
                type="button"
                onClick={() => setUploadOpen(true)}
                disabled={disabled}
                className="flex aspect-square flex-col items-center justify-center rounded-md border border-dashed border-gray-300 bg-gray-50 text-center transition hover:border-blue-300 hover:bg-blue-50 disabled:cursor-not-allowed disabled:opacity-60"
              >
                <ImageOff size={18} className="text-gray-400" />
                <span className="mt-1 text-[11px] font-medium text-gray-500">
                  {isMain ? 'Главное фото' : `Фото ${index + 1}`}
                </span>
              </button>
            );
          }

          return (
            <DraggableImageTile
              key={`${preview.file.name}-${preview.file.size}-${index}`}
              index={index}
              src={preview.url}
              title={preview.file.name}
              main={isMain}
              disabled={disabled}
              onRemove={() => removeFile(index)}
              onReorder={reorderFile}
            />
          );
        })}
      </div>

      <p className="mt-2 text-xs text-gray-500">
        Файлы сохранятся после создания позиции. JPEG, PNG или WebP до 5 МБ.
      </p>

      <Modal open={uploadOpen} onClose={() => setUploadOpen(false)} title="Добавить фото" size="sm">
        <ImageFilePicker
          existingCount={files.length}
          disabled={disabled}
          onCancel={() => setUploadOpen(false)}
          onFiles={nextFiles => {
            appendFiles(nextFiles);
            setUploadOpen(false);
          }}
        />
      </Modal>
    </Card>
  );
}

function UploadedImageGrid({
  images,
  onUploadClick,
  onReorder,
}: {
  images: ResourceImage[];
  onUploadClick: () => void;
  onReorder: (fromIndex: number, toIndex: number) => void;
}) {
  return (
    <div className="grid grid-cols-2 gap-2 sm:grid-cols-5">
      {Array.from({ length: MAX_RESOURCE_IMAGES }).map((_, index) => {
        const image = images[index];
        const isMain = index === 0;

        if (!image) {
          return (
            <button
              key={`uploaded-placeholder-${index}`}
              type="button"
              onClick={onUploadClick}
              className="flex aspect-square flex-col items-center justify-center rounded-md border border-dashed border-gray-300 bg-gray-50 text-center transition hover:border-blue-300 hover:bg-blue-50"
            >
              <ImageOff size={18} className="text-gray-400" />
              <span className="mt-1 text-[11px] font-medium text-gray-500">
                {isMain ? 'Главное фото' : `Фото ${index + 1}`}
              </span>
            </button>
          );
        }

        return (
          <DraggableImageTile
            key={image.imageId}
            index={index}
            src={image.url}
            title={image.originalFileName}
            main={isMain}
            onOpen={onUploadClick}
            onReorder={onReorder}
          />
        );
      })}
    </div>
  );
}

function DraggableImageTile({
  index,
  src,
  title,
  main,
  disabled = false,
  onOpen,
  onRemove,
  onReorder,
}: {
  index: number;
  src: string;
  title: string;
  main: boolean;
  disabled?: boolean;
  onOpen?: () => void;
  onRemove?: () => void;
  onReorder: (fromIndex: number, toIndex: number) => void;
}) {
  const suppressClickRef = useRef(false);
  const [dragging, setDragging] = useState(false);
  const [dragOver, setDragOver] = useState(false);

  const handleDragStart = (event: DragEvent<HTMLDivElement>) => {
    if (disabled) return;
    event.dataTransfer.effectAllowed = 'move';
    event.dataTransfer.setData('text/plain', String(index));
    suppressClickRef.current = true;
    setDragging(true);
  };

  const handleDrop = (event: DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    setDragOver(false);

    const fromIndex = Number(event.dataTransfer.getData('text/plain'));
    if (Number.isNaN(fromIndex)) return;
    onReorder(fromIndex, index);
  };

  return (
    <div
      draggable={!disabled}
      onClick={() => {
        if (suppressClickRef.current) {
          suppressClickRef.current = false;
          return;
        }
        onOpen?.();
      }}
      onDragStart={handleDragStart}
      onDragEnd={() => {
        setDragging(false);
        setDragOver(false);
      }}
      onDragOver={event => {
        if (disabled) return;
        event.preventDefault();
        event.dataTransfer.dropEffect = 'move';
        setDragOver(true);
      }}
      onDragLeave={() => setDragOver(false)}
      onDrop={handleDrop}
      className={`group relative aspect-square overflow-hidden rounded-md border bg-gray-50 transition ${
        dragOver ? 'border-blue-400 ring-2 ring-blue-100' : 'border-gray-200'
      } ${dragging ? 'opacity-50' : ''} ${disabled ? 'cursor-default' : 'cursor-grab active:cursor-grabbing'}`}
      title={title}
      role={onOpen ? 'button' : undefined}
      tabIndex={onOpen ? 0 : undefined}
      onKeyDown={event => {
        if (onOpen && (event.key === 'Enter' || event.key === ' ')) {
          event.preventDefault();
          onOpen();
        }
      }}
    >
      <img src={src} alt={title} className="h-full w-full object-cover transition group-hover:scale-105" />
      {main && (
        <span className="absolute left-2 top-2 rounded bg-white/90 px-1.5 py-0.5 text-[10px] font-medium text-gray-800 shadow-sm">
          Главное
        </span>
      )}
      <span className="absolute bottom-2 left-2 inline-flex h-7 w-7 items-center justify-center rounded-md bg-white/90 text-gray-600 opacity-0 shadow-sm transition group-hover:opacity-100">
        <GripVertical size={14} />
      </span>
      {onRemove && (
        <button
          type="button"
          onClick={event => {
            event.stopPropagation();
            onRemove();
          }}
          disabled={disabled}
          className="absolute right-2 top-2 inline-flex h-7 w-7 items-center justify-center rounded-md bg-white/90 text-gray-700 shadow-sm transition hover:bg-red-50 hover:text-red-700 disabled:opacity-60"
          aria-label={`Удалить фото ${index + 1}`}
        >
          <Trash2 size={13} />
        </button>
      )}
      <div className="absolute inset-x-0 bottom-0 bg-black/45 px-2 py-1 text-[11px] text-white opacity-0 transition group-hover:opacity-100">
        <p className="truncate pl-8">{title}</p>
      </div>
    </div>
  );
}

function ImageFilePicker({
  existingCount,
  disabled,
  onCancel,
  onFiles,
}: {
  existingCount: number;
  disabled: boolean;
  onCancel: () => void;
  onFiles: (files: File[]) => void;
}) {
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const remainingSlots = Math.max(MAX_RESOURCE_IMAGES - existingCount, 0);

  return (
    <div className="space-y-4">
      <label className="flex cursor-pointer flex-col items-center justify-center rounded-md border border-dashed border-gray-300 bg-gray-50 px-4 py-8 text-center transition hover:border-blue-300 hover:bg-blue-50">
        <Upload size={22} className="text-gray-400" />
        <span className="mt-2 text-sm font-medium text-gray-800">Выберите изображения</span>
        <span className="mt-1 text-xs text-gray-500">Осталось мест: {remainingSlots}</span>
        <input
          type="file"
          accept="image/jpeg,image/png,image/webp"
          multiple
          className="sr-only"
          disabled={disabled || remainingSlots === 0}
          onChange={event => setSelectedFiles(Array.from(event.target.files ?? []).slice(0, remainingSlots))}
        />
      </label>

      {selectedFiles.length > 0 && (
        <div className="space-y-1 rounded-md border border-gray-200 bg-white p-3">
          {selectedFiles.map(file => (
            <div key={`${file.name}-${file.size}`} className="flex items-center justify-between gap-3 text-xs">
              <span className="truncate text-gray-700">{file.name}</span>
              <span className="shrink-0 text-gray-500">{(file.size / 1024 / 1024).toFixed(2)} МБ</span>
            </div>
          ))}
        </div>
      )}

      <div className="flex justify-end gap-2">
        <Button variant="secondary" onClick={onCancel} disabled={disabled}>Отмена</Button>
        <Button
          variant="primary"
          onClick={() => onFiles(selectedFiles)}
          disabled={disabled || selectedFiles.length === 0}
        >
          Добавить
        </Button>
      </div>
    </div>
  );
}
