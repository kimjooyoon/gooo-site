import assert from 'node:assert/strict';
import test from 'node:test';
import {hasSupportedDocumentLanguage} from './document-language.mjs';

const accepted = [
  ['English root', '<!doctype html><html lang="en"><body></body></html>'],
  ['Korean root', '<!doctype html><html lang="ko"><body></body></html>'],
  ['single quoted language', "<html lang='ko'>"],
  ['unquoted language', '<html lang=ko>'],
  ['other root attributes', '<html class="language-map" lang="ko" data-theme="light">'],
  ['case insensitive language', '<HTML LANG="EN">'],
];
const rejected = [
  ['missing root language', '<html><body lang="en"></body></html>'],
  ['missing root element', '<main lang="en"></main>'],
  ['unsupported language', '<html lang="fr">'],
  ['empty language', '<html lang="">'],
  ['duplicate root language', '<html lang="en" LANG="ko">'],
  ['language hidden in another attribute', `<html data-note=' lang="en" '>`],
  ['comment is not the root', '<!-- <html lang="en"> --><html>'],
  ['custom element is not the root', '<html-widget lang="en">'],
  ['language without a value', '<html lang>'],
];
for (const [name, html] of accepted) {
  test(name, () => assert.equal(hasSupportedDocumentLanguage(html), true));
}
for (const [name, html] of rejected) {
  test(name, () => assert.equal(hasSupportedDocumentLanguage(html), false));
}
