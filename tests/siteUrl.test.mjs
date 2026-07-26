import assert from 'node:assert/strict'
import { describe, it, beforeEach, afterEach } from 'node:test'
import { DEFAULT_PUBLIC_SITE_URL, resolvePublicSiteUrl } from '../lib/siteUrl.js'

describe('resolvePublicSiteUrl', () => {
  const prev = process.env.NEXT_PUBLIC_SITE_URL

  beforeEach(() => {
    delete process.env.NEXT_PUBLIC_SITE_URL
  })

  afterEach(() => {
    if (prev === undefined) delete process.env.NEXT_PUBLIC_SITE_URL
    else process.env.NEXT_PUBLIC_SITE_URL = prev
  })

  it('uses NEXT_PUBLIC_SITE_URL when set', () => {
    process.env.NEXT_PUBLIC_SITE_URL = 'https://preview.example.com/'
    assert.equal(resolvePublicSiteUrl(), 'https://preview.example.com')
  })

  it('falls back to the hardcoded production domain when env is missing', () => {
    assert.equal(resolvePublicSiteUrl(), DEFAULT_PUBLIC_SITE_URL)
  })

  it('ignores blank env values', () => {
    process.env.NEXT_PUBLIC_SITE_URL = '   '
    assert.equal(resolvePublicSiteUrl(), DEFAULT_PUBLIC_SITE_URL)
  })
})
