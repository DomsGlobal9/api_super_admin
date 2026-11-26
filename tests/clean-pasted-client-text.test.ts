/**
 * Text pasted into the client forms must not carry invisible characters or stray spaces.
 *
 * An admin pasted "label.swathyreddy12@gmail.com" into Provision Client and the browser refused
 * it ("A part followed by '@' should not contain the symbol ''"): the paste carried a character
 * nobody can see. The same forms had already saved a company name as "sirimalle " with a
 * trailing space, which later blocked the "type the name to confirm" box.
 */
import { describe, it, expect } from 'vitest';
import { cleanBlock, cleanCompact, cleanLine, normaliseTyping } from '../src/lib/utils';
import { CreateClientSchema, UpdateClientSchema } from '../src/features/clients/client.schema';

const ZWSP = '​';
const NBSP = ' ';
const BOM = '﻿';
const EMAIL = 'label.swathyreddy12@gmail.com';

describe('normaliseTyping (runs on every keystroke)', () => {
  it('drops invisible characters', () => {
    expect(normaliseTyping(`${BOM}Acme${ZWSP} Corp­`)).toBe('Acme Corp');
  });
  it('turns a non-breaking space into an ordinary one', () => {
    expect(normaliseTyping(`Acme${NBSP}Corp`)).toBe('Acme Corp');
  });
  it('never trims, so a space can be typed before the next word', () => {
    expect(normaliseTyping('Acme ')).toBe('Acme ');
  });
});

describe('cleanLine, cleanBlock, cleanCompact', () => {
  it('cleanLine trims and collapses runs of spaces', () => {
    expect(cleanLine(`  sirimalle ${NBSP}`)).toBe('sirimalle');
    expect(cleanLine('swathyreddy   designer\tstudio')).toBe('swathyreddy designer studio');
  });
  it('cleanBlock trims but keeps line breaks', () => {
    expect(cleanBlock(`  line one\nline two${ZWSP}  `)).toBe('line one\nline two');
  });
  it('cleanCompact removes every kind of space, for emails and phones', () => {
    expect(cleanCompact(`${EMAIL}${ZWSP}`)).toBe(EMAIL);
    expect(cleanCompact(` ${EMAIL}${NBSP}`)).toBe(EMAIL);
    expect(cleanCompact('98765 43210')).toBe('9876543210');
  });
});

describe('CreateClientSchema cleans before it validates', () => {
  it('accepts the pasted email from the report and stores it clean', () => {
    const r = CreateClientSchema.safeParse({ companyName: 'swathyreddy designer studio', email: `${EMAIL}${ZWSP}` });
    expect(r.success).toBe(true);
    expect(r.data?.email).toBe(EMAIL);
  });
  it('stores a company name without surrounding or doubled spaces', () => {
    const r = CreateClientSchema.safeParse({ companyName: `sirimalle ${NBSP}`, email: 'a@b.co' });
    expect(r.data?.companyName).toBe('sirimalle');
  });
  it('still refuses a name that is only spaces, and an email that is not one', () => {
    expect(CreateClientSchema.safeParse({ companyName: `  ${NBSP}${ZWSP} `, email: 'a@b.co' }).success).toBe(false);
    expect(CreateClientSchema.safeParse({ companyName: 'Acme', email: 'not an email' }).success).toBe(false);
  });
  it('accepts a phone typed with a space and stores ten digits', () => {
    const r = CreateClientSchema.safeParse({ companyName: 'Acme', email: 'a@b.co', phone: '98765 43210' });
    expect(r.data?.phone).toBe('9876543210');
  });
  it('keeps empty optional fields empty', () => {
    const r = CreateClientSchema.safeParse({ companyName: 'Acme', email: 'a@b.co', phone: '', websiteUrl: '  ' });
    expect(r.success).toBe(true);
    expect([r.data?.phone, r.data?.websiteUrl]).toEqual(['', '']);
  });
});

describe('UpdateClientSchema (profile edits, suspend)', () => {
  it('cleans the fields it is sent and leaves out the ones it is not', () => {
    const r = UpdateClientSchema.safeParse({ companyName: ' sirimalle ' });
    expect(r.success).toBe(true);
    expect(r.data).toEqual({ companyName: 'sirimalle' });
  });
  it('a profile edit does NOT set the status, so it cannot reactivate a suspended client', () => {
    const r = UpdateClientSchema.safeParse({ companyName: 'Acme', email: 'a@b.co', notes: '' });
    expect(r.success).toBe(true);
    expect(r.data && 'status' in r.data).toBe(false);
  });
  it('a new client still defaults to ACTIVE', () => {
    expect(CreateClientSchema.parse({ companyName: 'Acme', email: 'a@b.co' }).status).toBe('ACTIVE');
  });
  it('a status-only update still parses', () => {
    const r = UpdateClientSchema.safeParse({ status: 'SUSPENDED' });
    expect(r.success).toBe(true);
    expect(r.data?.status).toBe('SUSPENDED');
  });
});
