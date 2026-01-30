import { describe, it, expect, vi, beforeEach } from 'vitest'
import { LDP, DCTERMS, POSIX, ACL } from '@inrupt/vocab-common-rdf'
import {
  FileMetadataSchema,
  ImageMetadataSchema,
  ContainerSchema,
  FileInputSchema,
  ContainerInputSchema,
  createFileMetadata,
  createContainer,
  addToContainer,
  parseFileMetadata,
  parseContainer,
  isFileMetadata,
  isContainer,
  SCHEMA,
} from '../../../src/schemas/file'

const BASE_URL = 'https://pod.example.com'

beforeEach(() => {
  vi.useFakeTimers()
  vi.setSystemTime(new Date('2024-06-15T12:00:00.000Z'))
})

describe('FileMetadataSchema', () => {
  const validFile = {
    '@id': 'https://pod.example.com/files/doc.pdf',
    '@type': [LDP.NonRDFSource],
    [DCTERMS.title]: 'Document',
    [DCTERMS.format]: 'application/pdf',
    [POSIX.size]: 1024,
  }

  it('validates a minimal file', () => {
    const result = FileMetadataSchema.safeParse(validFile)
    expect(result.success).toBe(true)
  })

  it('validates file with all fields', () => {
    const fullFile = {
      ...validFile,
      [DCTERMS.created]: '2024-01-01T00:00:00Z',
      [DCTERMS.modified]: '2024-06-01T00:00:00Z',
      [SCHEMA.author]: { '@id': 'https://pod.example.com/profile#me' },
      [ACL.accessControl]: { '@id': 'https://pod.example.com/files/doc.pdf.acl' },
      [DCTERMS.description]: 'A document',
    }

    expect(FileMetadataSchema.safeParse(fullFile).success).toBe(true)
  })

  it('validates file with additional type', () => {
    const file = {
      ...validFile,
      '@type': [LDP.NonRDFSource, SCHEMA.DigitalDocument],
    }
    expect(FileMetadataSchema.safeParse(file).success).toBe(true)
  })

  it('rejects file without NonRDFSource type', () => {
    const invalid = {
      '@id': 'https://pod.example.com/files/doc.pdf',
      '@type': [SCHEMA.DigitalDocument],
      [DCTERMS.title]: 'Document',
      [DCTERMS.format]: 'application/pdf',
      [POSIX.size]: 1024,
    }
    expect(FileMetadataSchema.safeParse(invalid).success).toBe(false)
  })

  it('rejects file without title', () => {
    const invalid = {
      '@id': 'https://pod.example.com/files/doc.pdf',
      '@type': [LDP.NonRDFSource],
      [DCTERMS.format]: 'application/pdf',
      [POSIX.size]: 1024,
    }
    expect(FileMetadataSchema.safeParse(invalid).success).toBe(false)
  })

  it('rejects file with negative size', () => {
    const invalid = { ...validFile, [POSIX.size]: -100 }
    expect(FileMetadataSchema.safeParse(invalid).success).toBe(false)
  })
})

describe('ImageMetadataSchema', () => {
  const validImage = {
    '@id': 'https://pod.example.com/photos/image.jpg',
    '@type': [LDP.NonRDFSource, SCHEMA.ImageObject],
    [DCTERMS.title]: 'Photo',
    [DCTERMS.format]: 'image/jpeg',
    [POSIX.size]: 2048,
  }

  it('validates a minimal image', () => {
    const result = ImageMetadataSchema.safeParse(validImage)
    expect(result.success).toBe(true)
  })

  it('validates image with dimensions', () => {
    const image = {
      ...validImage,
      'https://schema.org/width': 1920,
      'https://schema.org/height': 1080,
    }
    expect(ImageMetadataSchema.safeParse(image).success).toBe(true)
  })

  it('validates image with location', () => {
    const image = {
      ...validImage,
      [SCHEMA.contentLocation]: 'Paris, France',
      [SCHEMA.dateCreated]: '2024-06-01T12:00:00Z',
    }
    expect(ImageMetadataSchema.safeParse(image).success).toBe(true)
  })

  it('rejects image without ImageObject type', () => {
    const invalid = {
      '@id': 'https://pod.example.com/photos/image.jpg',
      '@type': [LDP.NonRDFSource],
      [DCTERMS.title]: 'Photo',
      [DCTERMS.format]: 'image/jpeg',
      [POSIX.size]: 2048,
    }
    expect(ImageMetadataSchema.safeParse(invalid).success).toBe(false)
  })

  it('rejects image without NonRDFSource type', () => {
    const invalid = {
      '@id': 'https://pod.example.com/photos/image.jpg',
      '@type': [SCHEMA.ImageObject],
      [DCTERMS.title]: 'Photo',
      [DCTERMS.format]: 'image/jpeg',
      [POSIX.size]: 2048,
    }
    expect(ImageMetadataSchema.safeParse(invalid).success).toBe(false)
  })
})

describe('ContainerSchema', () => {
  const validContainer = {
    '@id': 'https://pod.example.com/files/',
    '@type': [LDP.Container],
  }

  it('validates a minimal container', () => {
    const result = ContainerSchema.safeParse(validContainer)
    expect(result.success).toBe(true)
  })

  it('validates BasicContainer type', () => {
    const container = {
      '@id': 'https://pod.example.com/files/',
      '@type': [LDP.BasicContainer],
    }
    expect(ContainerSchema.safeParse(container).success).toBe(true)
  })

  it('validates container with all fields', () => {
    const fullContainer = {
      ...validContainer,
      '@type': [LDP.Container, LDP.BasicContainer],
      [DCTERMS.title]: 'Files',
      [DCTERMS.description]: 'My files folder',
      [DCTERMS.created]: '2024-01-01T00:00:00Z',
      [DCTERMS.modified]: '2024-06-01T00:00:00Z',
      [LDP.contains]: { '@id': 'https://pod.example.com/files/doc.pdf' },
    }

    expect(ContainerSchema.safeParse(fullContainer).success).toBe(true)
  })

  it('validates container with multiple children', () => {
    const container = {
      ...validContainer,
      [LDP.contains]: [
        { '@id': 'https://pod.example.com/files/doc1.pdf' },
        { '@id': 'https://pod.example.com/files/doc2.pdf' },
      ],
    }
    expect(ContainerSchema.safeParse(container).success).toBe(true)
  })

  it('rejects container without Container or BasicContainer type', () => {
    const invalid = {
      '@id': 'https://pod.example.com/files/',
      '@type': [LDP.Resource],
    }
    expect(ContainerSchema.safeParse(invalid).success).toBe(false)
  })
})

describe('FileInputSchema', () => {
  it('validates minimal input', () => {
    const result = FileInputSchema.safeParse({
      name: 'doc.pdf',
      mimeType: 'application/pdf',
      size: 1024,
    })
    expect(result.success).toBe(true)
  })

  it('validates full input', () => {
    const input = {
      name: 'photo.jpg',
      mimeType: 'image/jpeg',
      size: 2048,
      description: 'A photo',
      authorId: 'https://pod.example.com/profile#me',
      isImage: true,
      width: 1920,
      height: 1080,
      location: 'Paris',
    }
    expect(FileInputSchema.safeParse(input).success).toBe(true)
  })

  it('rejects empty name', () => {
    expect(FileInputSchema.safeParse({
      name: '',
      mimeType: 'application/pdf',
      size: 1024,
    }).success).toBe(false)
  })

  it('rejects negative size', () => {
    expect(FileInputSchema.safeParse({
      name: 'doc.pdf',
      mimeType: 'application/pdf',
      size: -1,
    }).success).toBe(false)
  })

  it('rejects invalid author URL', () => {
    expect(FileInputSchema.safeParse({
      name: 'doc.pdf',
      mimeType: 'application/pdf',
      size: 1024,
      authorId: 'not-a-url',
    }).success).toBe(false)
  })
})

describe('ContainerInputSchema', () => {
  it('validates minimal input', () => {
    const result = ContainerInputSchema.safeParse({ name: 'Files' })
    expect(result.success).toBe(true)
  })

  it('validates full input', () => {
    const input = {
      name: 'Photos',
      description: 'My photo collection',
    }
    expect(ContainerInputSchema.safeParse(input).success).toBe(true)
  })

  it('rejects empty name', () => {
    expect(ContainerInputSchema.safeParse({ name: '' }).success).toBe(false)
  })
})

describe('createFileMetadata', () => {
  it('creates file metadata with minimal input', () => {
    const metadata = createFileMetadata(
      { name: 'Document', mimeType: 'application/pdf', size: 1024 },
      'https://pod.example.com/files/',
      'doc.pdf'
    )

    expect(metadata['@id']).toBe('https://pod.example.com/files/doc.pdf')
    expect(metadata['@type']).toContain(LDP.NonRDFSource)
    expect(metadata[DCTERMS.title]).toBe('Document')
    expect(metadata[DCTERMS.format]).toBe('application/pdf')
    expect(metadata[POSIX.size]).toBe(1024)
    expect(metadata[DCTERMS.created]).toBe('2024-06-15T12:00:00.000Z')
    expect(metadata[DCTERMS.modified]).toBe('2024-06-15T12:00:00.000Z')
  })

  it('adds DigitalDocument type for PDF', () => {
    const metadata = createFileMetadata(
      { name: 'Doc', mimeType: 'application/pdf', size: 1024 },
      'https://pod.example.com/files/',
      'doc.pdf'
    )

    expect(metadata['@type']).toContain(SCHEMA.DigitalDocument)
  })

  it('adds ImageObject type for images', () => {
    const metadata = createFileMetadata(
      { name: 'Photo', mimeType: 'image/jpeg', size: 2048 },
      'https://pod.example.com/photos/',
      'photo.jpg'
    )

    expect(metadata['@type']).toContain(SCHEMA.ImageObject)
  })

  it('adds AudioObject type for audio', () => {
    const metadata = createFileMetadata(
      { name: 'Song', mimeType: 'audio/mp3', size: 5000 },
      'https://pod.example.com/audio/',
      'song.mp3'
    )

    expect(metadata['@type']).toContain(SCHEMA.AudioObject)
  })

  it('adds VideoObject type for video', () => {
    const metadata = createFileMetadata(
      { name: 'Video', mimeType: 'video/mp4', size: 10000 },
      'https://pod.example.com/video/',
      'movie.mp4'
    )

    expect(metadata['@type']).toContain(SCHEMA.VideoObject)
  })

  it('adds optional fields', () => {
    const metadata = createFileMetadata(
      {
        name: 'Doc',
        mimeType: 'application/pdf',
        size: 1024,
        description: 'A document',
        authorId: 'https://pod.example.com/profile#me',
      },
      'https://pod.example.com/files/',
      'doc.pdf'
    )

    expect(metadata[DCTERMS.description]).toBe('A document')
    expect(metadata[SCHEMA.author]).toEqual({ '@id': 'https://pod.example.com/profile#me' })
  })

  it('adds image-specific fields', () => {
    const metadata = createFileMetadata(
      {
        name: 'Photo',
        mimeType: 'image/jpeg',
        size: 2048,
        width: 1920,
        height: 1080,
        location: 'Paris',
      },
      'https://pod.example.com/photos/',
      'photo.jpg'
    )

    expect(metadata['https://schema.org/width']).toBe(1920)
    expect(metadata['https://schema.org/height']).toBe(1080)
    expect(metadata[SCHEMA.contentLocation]).toBe('Paris')
  })

  it('includes @context', () => {
    const metadata = createFileMetadata(
      { name: 'Doc', mimeType: 'application/pdf', size: 1024 },
      'https://pod.example.com/files/',
      'doc.pdf'
    )
    expect(metadata['@context']).toBeDefined()
  })
})

describe('createContainer', () => {
  it('creates container with minimal input', () => {
    const container = createContainer(
      { name: 'Files' },
      BASE_URL,
      '/files/'
    )

    expect(container['@id']).toBe('https://pod.example.com/files/')
    expect(container['@type']).toContain(LDP.Container)
    expect(container['@type']).toContain(LDP.BasicContainer)
    expect(container[DCTERMS.title]).toBe('Files')
    expect(container[DCTERMS.created]).toBe('2024-06-15T12:00:00.000Z')
    expect(container[DCTERMS.modified]).toBe('2024-06-15T12:00:00.000Z')
  })

  it('adds description', () => {
    const container = createContainer(
      { name: 'Photos', description: 'My photo collection' },
      BASE_URL,
      '/photos/'
    )

    expect(container[DCTERMS.description]).toBe('My photo collection')
  })

  it('includes @context', () => {
    const container = createContainer({ name: 'Files' }, BASE_URL, '/files/')
    expect(container['@context']).toBeDefined()
  })
})

describe('addToContainer', () => {
  it('adds first resource to empty container', () => {
    const container = createContainer({ name: 'Files' }, BASE_URL, '/files/')
    const updated = addToContainer(container, 'https://pod.example.com/files/doc.pdf')

    expect(updated[LDP.contains]).toEqual({ '@id': 'https://pod.example.com/files/doc.pdf' })
  })

  it('adds second resource as array', () => {
    let container = createContainer({ name: 'Files' }, BASE_URL, '/files/')
    container = addToContainer(container, 'https://pod.example.com/files/doc1.pdf')
    container = addToContainer(container, 'https://pod.example.com/files/doc2.pdf')

    expect(container[LDP.contains]).toEqual([
      { '@id': 'https://pod.example.com/files/doc1.pdf' },
      { '@id': 'https://pod.example.com/files/doc2.pdf' },
    ])
  })

  it('adds to existing array', () => {
    let container = createContainer({ name: 'Files' }, BASE_URL, '/files/')
    container = addToContainer(container, 'https://pod.example.com/files/doc1.pdf')
    container = addToContainer(container, 'https://pod.example.com/files/doc2.pdf')
    container = addToContainer(container, 'https://pod.example.com/files/doc3.pdf')

    expect(Array.isArray(container[LDP.contains])).toBe(true)
    expect((container[LDP.contains] as Array<{ '@id': string }>).length).toBe(3)
  })

  it('updates modified timestamp', () => {
    const container = createContainer({ name: 'Files' }, BASE_URL, '/files/')

    vi.setSystemTime(new Date('2024-06-16T12:00:00.000Z'))
    const updated = addToContainer(container, 'https://pod.example.com/files/doc.pdf')

    expect(updated[DCTERMS.modified]).toBe('2024-06-16T12:00:00.000Z')
  })
})

describe('parseFileMetadata', () => {
  it('parses valid file data', () => {
    const data = {
      '@id': 'https://pod.example.com/files/doc.pdf',
      '@type': [LDP.NonRDFSource],
      [DCTERMS.title]: 'Document',
      [DCTERMS.format]: 'application/pdf',
      [POSIX.size]: 1024,
    }

    const metadata = parseFileMetadata(data)
    expect(metadata[DCTERMS.title]).toBe('Document')
  })

  it('throws on invalid data', () => {
    expect(() => parseFileMetadata({})).toThrow()
  })
})

describe('parseContainer', () => {
  it('parses valid container data', () => {
    const data = {
      '@id': 'https://pod.example.com/files/',
      '@type': [LDP.Container],
    }

    const container = parseContainer(data)
    expect(container['@id']).toBe('https://pod.example.com/files/')
  })

  it('throws on invalid data', () => {
    expect(() => parseContainer({})).toThrow()
  })
})

describe('isFileMetadata', () => {
  it('returns true for valid file metadata', () => {
    const metadata = createFileMetadata(
      { name: 'Doc', mimeType: 'application/pdf', size: 1024 },
      'https://pod.example.com/files/',
      'doc.pdf'
    )
    expect(isFileMetadata(metadata)).toBe(true)
  })

  it('returns false for invalid data', () => {
    expect(isFileMetadata({})).toBe(false)
    expect(isFileMetadata({ name: 'doc' })).toBe(false)
    expect(isFileMetadata(null)).toBe(false)
  })
})

describe('isContainer', () => {
  it('returns true for valid container', () => {
    const container = createContainer({ name: 'Files' }, BASE_URL, '/files/')
    expect(isContainer(container)).toBe(true)
  })

  it('returns false for invalid data', () => {
    expect(isContainer({})).toBe(false)
    expect(isContainer({ name: 'Files' })).toBe(false)
    expect(isContainer(null)).toBe(false)
  })
})

describe('SCHEMA constants', () => {
  it('has correct namespace', () => {
    expect(SCHEMA.NAMESPACE).toBe('https://schema.org/')
  })

  it('has expected terms', () => {
    expect(SCHEMA.DigitalDocument).toBe('https://schema.org/DigitalDocument')
    expect(SCHEMA.ImageObject).toBe('https://schema.org/ImageObject')
    expect(SCHEMA.author).toBe('https://schema.org/author')
  })
})
