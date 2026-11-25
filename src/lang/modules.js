// Built-in importable modules: `import "std/ui";`. They are written in VLY (see docs/modules.md) and, like the
// standard library, only the parts you call end up in the cartridge.

const UI_TILES = `# Frame and cursor tiles for std/ui. Color 3 is the line, 0 is the background.
tile ui_tl:
  ........
  .3333333
  .3......
  .3......
  .3......
  .3......
  .3......
  .3......
tile ui_tr:
  ........
  3333333.
  ......3.
  ......3.
  ......3.
  ......3.
  ......3.
  ......3.
tile ui_bl:
  .3......
  .3......
  .3......
  .3......
  .3......
  .3......
  .3333333
  ........
tile ui_br:
  ......3.
  ......3.
  ......3.
  ......3.
  ......3.
  ......3.
  3333333.
  ........
tile ui_t:
  ........
  33333333
  ........
  ........
  ........
  ........
  ........
  ........
tile ui_b:
  ........
  ........
  ........
  ........
  ........
  ........
  33333333
  ........
tile ui_l:
  .3......
  .3......
  .3......
  .3......
  .3......
  .3......
  .3......
  .3......
tile ui_r:
  ......3.
  ......3.
  ......3.
  ......3.
  ......3.
  ......3.
  ......3.
  ......3.
tile ui_fill:
  ........
  ........
  ........
  ........
  ........
  ........
  ........
  ........
tile ui_cursor:
  ..3.....
  ..33....
  ..333...
  ..3333..
  ..333...
  ..33....
  ..3.....
  ........
tile ui_more:
  ........
  ........
  .333333.
  ..3333..
  ...33...
  ........
  ........
  ........
`;

const UI_SOURCE = `
// std/ui: boxes, menus and typewriter dialogue drawn into a 32x32 map (BG_MAP or WIN_MAP).
// Needs load_font() first. Tiles used: ui_tiles_COUNT tiles loaded at ui_init(first).
tileset ui_tiles = "std/ui.tiles";
var ui_base;
func ui_init(first) {
  ui_base = first;
  load_tiles(ui_tiles, first, ui_tiles_COUNT);
}
func ui_cell(map, col, row, tile) {
  poke(map + ((row << 5) + col) * 2, ui_base + tile + (text_pal << 12));
}
// Draw a framed, blank box of w x h cells with its top-left corner at (col, row).
func ui_box(map, col, row, w, h) {
  for (var y = 0; y < h; y++) {
    for (var x = 0; x < w; x++) {
      var t = ui_tiles_ui_fill;
      if (y == 0) { t = ui_tiles_ui_t; }
      if (y == h - 1) { t = ui_tiles_ui_b; }
      if (x == 0) { t = ui_tiles_ui_l; }
      if (x == w - 1) { t = ui_tiles_ui_r; }
      if (y == 0 && x == 0) { t = ui_tiles_ui_tl; }
      if (y == 0 && x == w - 1) { t = ui_tiles_ui_tr; }
      if (y == h - 1 && x == 0) { t = ui_tiles_ui_bl; }
      if (y == h - 1 && x == w - 1) { t = ui_tiles_ui_br; }
      ui_cell(map, col + x, row + y, t);
    }
  }
}
// Blank a rectangle of cells (the font's space glyph).
func ui_clear(map, col, row, w, h) {
  for (var y = 0; y < h; y++) {
    for (var x = 0; x < w; x++) { poke(map + (((row + y) << 5) + col + x) * 2, font_base); }
  }
}
// The column that centres something w cells wide on the 20-cell screen (a menu, a grid, a title). Use it instead of a hand-picked margin.
func ui_centre(w) { return (20 - w) / 2; }
func ui_strlen(s) {
  var n = 0;
  while (peek8(s + n) != 0) { n++; }
  return n;
}

// ---- menus: one at a time. items is a word table of strings. ----
var menu_map;
var menu_col;
var menu_row;
var menu_items;
var menu_count;
var menu_sel;
var menu_w;
var menu_gap = 1;            // rows per item: 1 packs them (the glyphs touch), 2 leaves a blank row between items and reads much better
var menu_sel_pal;            // 0: only the arrow marks the selection. 1 to 7: the selected item is also drawn with this background palette (make it an INVERSE of palette 0, so it is a light bar with dark letters: see docs ref-readability)
func menu_item_row(i) { return menu_row + 1 + i * menu_gap; }
func menu_draw_item(i, pal) {
  var oldp = text_pal;
  text_pal = pal;
  put_text(menu_map, menu_col + 2, menu_item_row(i), peek(menu_items + i * 2));
  for (var k = ui_strlen(peek(menu_items + i * 2)); k < menu_w; k++) { poke(menu_map + (((menu_item_row(i)) << 5) + menu_col + 2 + k) * 2, font_base + (pal << 12)); }
  text_pal = oldp;
}
func menu_draw_cursor() {
  for (var i = 0; i < menu_count; i++) {
    var c = font_base;
    var pal = text_pal;
    if (i == menu_sel) { if (menu_sel_pal > 0) { pal = menu_sel_pal; } c = ui_base + ui_tiles_ui_cursor + (pal << 12); }
    else if (menu_sel_pal > 0) { c = font_base + (pal << 12); }
    if (menu_sel_pal > 0) { menu_draw_item(i, pal); }
    poke(menu_map + ((menu_item_row(i) << 5) + menu_col + 1) * 2, c);
  }
}
// Open a menu: draws the box and the items. Returns nothing; call menu_update() every frame.
func menu_open(map, col, row, items, count) {
  menu_map = map; menu_col = col; menu_row = row; menu_items = items; menu_count = count; menu_sel = 0;
  var w = 0;
  for (var i = 0; i < count; i++) { w = max(w, ui_strlen(peek(items + i * 2))); }
  menu_w = w;
  ui_box(map, col, row, w + 4, (count - 1) * menu_gap + 3);
  for (var j = 0; j < count; j++) { put_text(map, col + 2, menu_item_row(j), peek(items + j * 2)); }
  menu_draw_cursor();
}
// Handle the D-pad and buttons. Returns -1 while nothing is chosen, the chosen index (0..n-1) when A or START is pressed,
// or -2 when B is pressed.
func menu_update() {
  if (btnp(BTN_DOWN)) { menu_sel = menu_sel + 1; if (menu_sel >= menu_count) { menu_sel = 0; } menu_draw_cursor(); }
  if (btnp(BTN_UP)) { menu_sel = menu_sel - 1; if (menu_sel < 0) { menu_sel = menu_count - 1; } menu_draw_cursor(); }
  if (btnp(BTN_A) || btnp(BTN_START)) { return menu_sel; }
  if (btnp(BTN_B)) { return -2; }
  return -1;
}
func menu_close() {
  var w = 0;
  for (var i = 0; i < menu_count; i++) { w = max(w, ui_strlen(peek(menu_items + i * 2))); }
  ui_clear(menu_map, menu_col, menu_row, w + 4, (menu_count - 1) * menu_gap + 3);
}

// ---- typewriter dialogue ----
var dlg_map;
var dlg_col;
var dlg_row;
var dlg_w;
var dlg_h;
var dlg_str;
var dlg_pos;
var dlg_cx;
var dlg_cy;
var dlg_timer;
var dlg_done;
// Draw a dialogue box (w x h cells including the frame) and get ready to show text in it.
func dialog_open(map, col, row, w, h) {
  dlg_map = map; dlg_col = col; dlg_row = row; dlg_w = w; dlg_h = h;
  ui_box(map, col, row, w, h);
}
// Start typing string s into the box (use \\n for a new line).
func dialog_say(s) {
  dlg_str = s; dlg_pos = 0; dlg_cx = 0; dlg_cy = 0; dlg_timer = 0; dlg_done = 0;
  ui_clear(dlg_map, dlg_col + 1, dlg_row + 1, dlg_w - 2, dlg_h - 2);
}
func dialog_put(c) {
  if (c == 10 || dlg_cx >= dlg_w - 2) { dlg_cx = 0; dlg_cy++; }
  if (c != 10) {
    poke(dlg_map + (((dlg_row + 1 + dlg_cy) << 5) + dlg_col + 1 + dlg_cx) * 2, (c - 32) + font_base + (text_pal << 12));
    dlg_cx++;
  }
}
// Does the word starting at dlg_pos fit on the current line? (Used for word wrapping.)
func dialog_word_fits() {
  var n = 0;
  var c = peek8(dlg_str + dlg_pos + n);
  while (c != 0 && c != 32 && c != 10) { n++; c = peek8(dlg_str + dlg_pos + n); }
  return dlg_cx + n <= dlg_w - 2;
}
// Call every frame. Types one character every other frame; A shows everything at once. When the text is complete a
// small arrow blinks and pressing A returns 1 (otherwise 0).
func dialog_update() {
  if (dlg_done) {
    if (btnp(BTN_A)) { return 1; }
    return 0;
  }
  dlg_timer++;
  var fast = btn(BTN_A);
  while ((dlg_timer >= 2 || fast) && !dlg_done) {
    dlg_timer = 0;
    var c = peek8(dlg_str + dlg_pos);
    if (c == 0) {
      dlg_done = 1;
      poke(dlg_map + (((dlg_row + dlg_h - 1) << 5) + dlg_col + dlg_w - 2) * 2, ui_base + ui_tiles_ui_more + (text_pal << 12));
    } else {
      // word wrap: at the start of a word that will not fit, move to the next line first
      if (c != 32 && c != 10 && (dlg_pos == 0 || peek8(dlg_str + dlg_pos - 1) == 32) && !dialog_word_fits()) { dlg_cx = 0; dlg_cy++; }
      if (!(c == 32 && dlg_cx == 0)) { dialog_put(c); }
      dlg_pos++;
      if (!fast) { fast = 0; dlg_timer = 0; break; }
    }
  }
  return 0;
}
func dialog_close() {
  ui_clear(dlg_map, dlg_col, dlg_row, dlg_w, dlg_h);
}
`;

const ANIM_SOURCE = `
// std/anim: tiny helpers for frame animation and timing.
// anim_frame(t, count, speed): which of \`count\` frames to show at time t when each frame lasts \`speed\` ticks.
func anim_frame(t, count, speed) { return umod(udiv(t, speed), count); }
// blink(t, period): 1 for \`period\` ticks, then 0 for \`period\` ticks, repeating.
func blink(t, period) { return umod(t, period * 2) < period; }
// approach(v, target, step): move v toward target by at most step without overshooting.
func approach(v, target, step) {
  if (v < target) { return min(v + step, target); }
  if (v > target) { return max(v - step, target); }
  return v;
}
`;

const MUSIC_SOURCE = `
// std/music: a tiny tracker. Up to 3 voices; each plays a btable of (note, steps) pairs on one audio channel.
//   btable lead = { N_C4, 2, N_E4, 2, N_G4, 4, 0, 2, MUS_LOOP };
//   music_tempo(8);                  // frames per step (8 = 7.5 steps a second)
//   music_play(0, 0, lead, 9);       // voice 0 on audio channel 0 at volume 9
//   func frame() { music_update(); }
// Notes are semitones: N_C2 = 1 up to N_B6 = 60 (sharps are N_CS4, N_FS4, ...); 0 is a rest.
// MUS_LOOP restarts the voice from the top, MUS_END stops it.
const MUS_LOOP = 255;
const MUS_END = 254;
const N_C2 = 1; const N_CS2 = 2; const N_D2 = 3; const N_DS2 = 4; const N_E2 = 5; const N_F2 = 6;
const N_FS2 = 7; const N_G2 = 8; const N_GS2 = 9; const N_A2 = 10; const N_AS2 = 11; const N_B2 = 12;
const N_C3 = 13; const N_CS3 = 14; const N_D3 = 15; const N_DS3 = 16; const N_E3 = 17; const N_F3 = 18;
const N_FS3 = 19; const N_G3 = 20; const N_GS3 = 21; const N_A3 = 22; const N_AS3 = 23; const N_B3 = 24;
const N_C4 = 25; const N_CS4 = 26; const N_D4 = 27; const N_DS4 = 28; const N_E4 = 29; const N_F4 = 30;
const N_FS4 = 31; const N_G4 = 32; const N_GS4 = 33; const N_A4 = 34; const N_AS4 = 35; const N_B4 = 36;
const N_C5 = 37; const N_CS5 = 38; const N_D5 = 39; const N_DS5 = 40; const N_E5 = 41; const N_F5 = 42;
const N_FS5 = 43; const N_G5 = 44; const N_GS5 = 45; const N_A5 = 46; const N_AS5 = 47; const N_B5 = 48;
const N_C6 = 49; const N_CS6 = 50; const N_D6 = 51; const N_DS6 = 52; const N_E6 = 53; const N_F6 = 54;
const N_FS6 = 55; const N_G6 = 56; const N_GS6 = 57; const N_A6 = 58; const N_AS6 = 59; const N_B6 = 60;
table mus_hz = {
  0, 65, 69, 73, 78, 82, 87, 92, 98, 104, 110, 117,
  123, 131, 139, 147, 156, 165, 175, 185, 196, 208, 220, 233,
  247, 262, 277, 294, 311, 330, 349, 370, 392, 415, 440, 466,
  494, 523, 554, 587, 622, 659, 698, 740, 784, 831, 880, 932,
  988, 1047, 1109, 1175, 1245, 1319, 1397, 1480, 1568, 1661, 1760, 1865,
  1976
};
var mus_song[3]; var mus_pos[3]; var mus_wait[3]; var mus_ch[3]; var mus_vol[3]; var mus_cur[3]; var mus_duty[3];
var mus_step = 8;
var mus_tick;
var mus_muted;
// Frames per step. Smaller is faster.
func music_tempo(frames_per_step) { mus_step = frames_per_step; }
// The pitch of a note number in hertz (N_A4 is 440): for tone() when a game plays a note on an event, a step or a key press.
func music_hz(n) { return mus_hz[n]; }
// Start \`song\` (a btable of note, steps pairs) on voice v (0-2) using audio channel ch (0-1 pulse, 2 triangle) at volume vol.
func music_play(v, ch, song, vol) {
  mus_song[v] = song; mus_pos[v] = 0; mus_wait[v] = 0; mus_ch[v] = ch; mus_vol[v] = vol; mus_cur[v] = 0; mus_duty[v] = 2;
}
// Pulse duty (0-3) for a voice; call after music_play.
func music_duty(v, d) { mus_duty[v] = d; }
// Is voice v still playing?
func music_playing(v) { return mus_song[v] != 0; }
// Stop one voice and silence its channel.
func music_stop(v) {
  if (mus_song[v] != 0) { tone_off(mus_ch[v]); }
  mus_song[v] = 0;
}
// Stop every voice.
func music_stop_all() { music_stop(0); music_stop(1); music_stop(2); }
// music_mute(1) silences the music but keeps time; music_mute(0) brings it back on the next note.
func music_mute(on) {
  mus_muted = on;
  if (on) { for (var v = 0; v < 3; v++) { if (mus_song[v] != 0) { tone_off(mus_ch[v]); } } }
}
// Build a long song out of short patterns, so a 20-second tune is a few bars of data and an order, not hundreds of numbers.
//   btable bass_pats = { N_A2,0,N_A2,0,N_A2,0,N_E3,0,   N_F2,0,N_F2,0,N_F2,0,N_C3,0 };   // two patterns of 8 steps
//   btable bass_order = { 0, 0, 1, 0 };                                                 // bars: pattern 0, 0, 1, 0
//   byte bass_buf[2 * 8 * 4 + 1];                                                       // 2 bytes per step, plus the loop mark
//   music_play(1, 2, music_build(bass_buf, bass_pats, 8, bass_order, 4), 8);
// Every step is a note (0 = rest) lasting one step. Returns buf, ready for music_play.
func music_build(buf, patterns, steps, order, count) {
  var p = buf;
  for (var i = 0; i < count; i++) {
    var src = patterns + peek8(order + i) * steps;
    for (var k = 0; k < steps; k++) { poke8(p, peek8(src + k)); poke8(p + 1, 1); p += 2; }
  }
  poke8(p, MUS_LOOP);
  return buf;
}
// Call once per frame.
func music_update() {
  var step = 0;
  mus_tick++;
  if (mus_tick >= mus_step) { mus_tick = 0; step = 1; }
  for (var v = 0; v < 3; v++) {
    var s = mus_song[v];
    if (s == 0) { continue; }
    if (step) {
      if (mus_wait[v] > 0) { mus_wait[v]--; }
      if (mus_wait[v] == 0) {
        var n = peek8(s + mus_pos[v]);
        if (n == MUS_LOOP) { mus_pos[v] = 0; n = peek8(s); if (n == MUS_LOOP) { n = MUS_END; } }
        if (n == MUS_END) { music_stop(v); continue; }
        mus_wait[v] = peek8(s + mus_pos[v] + 1);
        mus_pos[v] += 2;
        if (audio_hold[mus_ch[v]] > 0) { mus_cur[v] = 0; }   // a sound effect owns this channel right now
        else if (n != 0 && !mus_muted) { mus_cur[v] = mus_vol[v]; tone(mus_ch[v], mus_hz[n], mus_vol[v], mus_duty[v]); }
        else { mus_cur[v] = 0; tone_off(mus_ch[v]); }
        continue;
      }
    }
    // a soft pluck: fade toward half volume
    if ((mus_tick & 3) == 3 && mus_cur[v] > (mus_vol[v] >> 1) + 1 && audio_hold[mus_ch[v]] == 0) {
      mus_cur[v]--;
      poke8(AUDIO + (mus_ch[v] << 2) + 2, mus_cur[v]);
    }
  }
}
`;

const SPRITES_SOURCE = `
// std/sprites: hand out sprite slots each frame, so a stale sprite can never linger.
//   func frame() {
//     spr_begin(0);                       // slots 0..first-1 stay yours; start handing out from \`first\`
//     spr(hero_x, hero_y, TILE_HERO, 0);  // returns the slot used (or -1 when all 64 are in use)
//     for (var i = 0; i < n; i++) { spr(ex[i], ey[i], TILE_ENEMY, 1); }
//     spr_end();                          // hides every slot you did not use this frame
//   }
var spr_n; var spr_prev; var spr_ready;
func spr_begin(first) { spr_n = first; }
func spr(x, y, tile, attr) {
  if (spr_n >= 64) { return -1; }
  sprite(spr_n, x, y, tile, attr);
  spr_n++;
  return spr_n - 1;
}
func spr_end() {
  var top = spr_prev;
  if (!spr_ready) { top = 64; spr_ready = 1; }
  for (var i = spr_n; i < top; i++) { hide_sprite(i); }
  spr_prev = spr_n;
}
// How many slots this frame used so far (a budget check: stay well under 64).
func spr_used() { return spr_n; }
// Big letters as sprites: for a message over the race or a banner over the action. Needs load_font(0). One slot per letter (spaces
// are skipped); draw messages BEFORE the rest of the frame so they get the low slot numbers and sit on top.
func spr_text(x, y, s, pal) {
  var i = 0;
  var c = peek8(s);
  while (c != 0) {
    if (c != 32) { spr(x + i * 8, y, font_base + c - 32, pal); }
    i++;
    c = peek8(s + i);
  }
}
`;

const SFX_SOURCE = `
// std/sfx: ready-made sound effects that cooperate with std/music.
//   func frame() { music_update(); sfx_update(); if (btnp(BTN_A)) { sfx_play(SFX_JUMP); } }
// Tonal effects use audio channel 1 and noise effects channel 3; while an effect plays, the music voice on that channel
// yields and comes back at its next note. One effect plays at a time; a new one replaces the old.
const SFX_JUMP = 0; const SFX_LAND = 1; const SFX_COIN = 2; const SFX_HIT = 3; const SFX_POWER = 4; const SFX_SELECT = 5;
const SFX_BACK = 6; const SFX_EXPLODE = 7; const SFX_SHOOT = 8; const SFX_DEATH = 9; const SFX_PAUSE = 10; const SFX_WIN = 11;
// one row per segment: channel, hz at start, hz at end, volume at start, volume at end, frames, duty
table sfx_tab = {
  1, 280, 620, 12, 6, 8, 2,
  3, 300, 120, 10, 0, 6, 0,
  1, 988, 988, 12, 10, 3, 1,   1, 1319, 1319, 12, 0, 9, 1,
  3, 700, 150, 14, 0, 12, 0,
  1, 523, 523, 11, 9, 4, 2,   1, 659, 659, 11, 9, 4, 2,   1, 784, 784, 11, 9, 4, 2,   1, 1047, 1047, 11, 0, 10, 2,
  1, 880, 880, 10, 6, 3, 2,
  1, 660, 440, 9, 0, 5, 2,
  3, 400, 60, 15, 0, 28, 0,
  1, 1200, 300, 10, 0, 6, 1,
  1, 600, 80, 13, 0, 36, 2,
  1, 660, 660, 10, 8, 3, 2,   1, 440, 440, 10, 0, 5, 2,
  1, 523, 523, 12, 10, 6, 2,   1, 659, 659, 12, 10, 6, 2,   1, 784, 784, 12, 10, 6, 2,   1, 1047, 1047, 12, 0, 16, 2
};
table sfx_start = { 0, 1, 2, 4, 5, 9, 10, 11, 12, 13, 14, 16 };
table sfx_count = { 1, 1, 2, 1, 4, 1, 1, 1, 1, 1, 2, 4 };
var sfx_on; var sfx_seg; var sfx_end; var sfx_left; var sfx_len; var sfx_chan;
var sfx_h0; var sfx_h1; var sfx_v0; var sfx_v1; var sfx_duty;
func sfx_begin() {
  var b = sfx_seg * 7;
  sfx_chan = sfx_tab[b]; sfx_h0 = sfx_tab[b + 1]; sfx_h1 = sfx_tab[b + 2]; sfx_v0 = sfx_tab[b + 3]; sfx_v1 = sfx_tab[b + 4];
  sfx_len = sfx_tab[b + 5]; sfx_duty = sfx_tab[b + 6]; sfx_left = sfx_len;
  audio_hold[sfx_chan] = sfx_len + 2;
  tone(sfx_chan, sfx_h0, sfx_v0, sfx_duty);
}
// Stop the current effect.
func sfx_stop() { if (sfx_on) { tone_off(sfx_chan); sfx_on = 0; } }
// Play effect \`id\` (SFX_JUMP and friends).
func sfx_play(id) {
  sfx_stop();
  sfx_seg = sfx_start[id];
  sfx_end = sfx_seg + sfx_count[id];
  sfx_on = 1;
  sfx_begin();
}
// Hold \`ch\` for \`frames\` and play a tone on it (the tone stops by itself when the hold runs out, so call this every frame while it should sound), for effects you drive yourself, such as an engine whose pitch follows speed:
//   sfx_tone(2, 90 + speed * 4, 8, 0, 2);   // call every frame while it runs
var sfx_tn[4];
func sfx_tone(ch, hz, vol, duty, frames) { audio_hold[ch] = frames; sfx_tn[ch] = 1; tone(ch, hz, vol, duty); }
// Call once per frame.
func sfx_update() {
  for (var c = 0; c < 4; c++) { if (audio_hold[c] > 0) { audio_hold[c]--; if (audio_hold[c] == 0 && sfx_tn[c]) { sfx_tn[c] = 0; tone_off(c); } } }   // a tone from sfx_tone stops when its hold runs out
  if (!sfx_on) { return; }
  sfx_left--;
  if (sfx_left <= 0) {
    tone_off(sfx_chan);
    sfx_seg++;
    if (sfx_seg >= sfx_end) { sfx_on = 0; return; }
    sfx_begin();
    return;
  }
  var t = sfx_len - sfx_left;
  tone(sfx_chan, sfx_h0 + ((sfx_h1 - sfx_h0) * t) / sfx_len, sfx_v0 + ((sfx_v1 - sfx_v0) * t) / sfx_len, sfx_duty);
  audio_hold[sfx_chan] = sfx_left + 2;
}
`;

const STREAM_SOURCE = `
// std/stream: an endless scrolling world in the 32 x 32 background map, written one column at a time as the camera moves.
// You define the world:   func stream_tile(wx, row) { ... }   // the cell value (tile | palette << 12, flips allowed) at world
//                                                              // column wx (0, 1, 2, ...) and map row 0..31
// Then call  stream_start(cam_x)  once in init() (cam_x is the camera in pixels) and  stream_scroll(cam_x)  every frame.
// It keeps the 32 columns around the camera written (so it scrolls either way) and sets scroll() for you. A column costs
// about 20 set_cell calls, so keep stream_tile cheap (a lookup, a height table, a few comparisons).
var stream_lo;
func stream_column(wx) {
  var x = wx & 31;
  for (var r = 0; r < 20; r++) { set_cell(x, r, stream_tile(wx, r)); }
}
func stream_start(cam_x) {
  var c = (cam_x >> 3) - 1;
  if (c < 0) { c = 0; }
  stream_lo = c;
  for (var i = 0; i < 32; i++) { stream_column(c + i); }
  scroll(cam_x & 255, 0);
}
func stream_scroll(cam_x) {
  var c = cam_x >> 3;
  // the camera has moved right: bring the next column in on the right and drop the leftmost
  while (c + 22 > stream_lo + 32) { stream_column(stream_lo + 32); stream_lo++; }
  // the camera has moved left: the same on the other side
  while (c - 1 < stream_lo && stream_lo > 0) { stream_lo--; stream_column(stream_lo); }
  scroll(cam_x & 255, 0);
}
`;

const TUNES_SOURCE = `
// std/tunes: ready-made background music, so a game can have a good loop without composing one.
//   import "std/tunes";
//   func init() { tune_play(TUNE_ADVENTURE); }          // music on channels 0 (lead) and 2 (bass); channels 1 and 3 stay free for std/sfx
//   func frame() { music_update(); sfx_update(); }      // std/music and std/sfx are imported for you
// TUNE_TITLE (calm), TUNE_ADVENTURE (bright, bouncy), TUNE_ACTION (driving), TUNE_BOSS (fast and tense), TUNE_SPACE (spacious).
// Each is 16 to 24 bars, 20 to 30 seconds before it repeats. tune_play builds the song (about one frame of work), so call it when
// a scene starts, not every frame. tune_stop() silences it.
import "std/music";
import "std/sfx";
const TUNE_TITLE = 0; const TUNE_ADVENTURE = 1; const TUNE_ACTION = 2; const TUNE_BOSS = 3; const TUNE_SPACE = 4;
byte tune_lead[24 * 8 * 2 + 1];
byte tune_bass[24 * 8 * 2 + 1];
// title: A minor, slow
btable tn0_lp = { N_E5,0,0,N_C5,0,0,N_A4,0,   N_D5,0,0,N_B4,0,0,N_G4,0,   N_C5,0,0,N_A4,0,0,N_F4,0,   N_B4,0,N_GS4,0,N_E4,0,0,0 };
btable tn0_lo = { 0,1,2,3, 0,1,2,3, 0,1,2,3, 0,1,2,3 };
btable tn0_bp = { N_A2,0,0,0,N_E3,0,0,0,   N_G2,0,0,0,N_D3,0,0,0,   N_F2,0,0,0,N_C3,0,0,0,   N_E2,0,0,0,N_B2,0,0,0 };
// adventure: C major, bouncy
btable tn1_lp = { N_C5,0,N_E5,N_G5,N_E5,0,N_D5,N_C5,   N_B4,0,N_D5,N_G5,N_D5,0,N_C5,N_B4,   N_A4,0,N_C5,N_E5,N_C5,0,N_B4,N_A4,   N_A4,0,N_C5,N_F5,N_C5,0,N_B4,N_A4,
                  N_E5,0,N_E5,N_D5,N_C5,0,N_D5,0,   N_G5,0,N_G5,N_F5,N_E5,0,N_D5,0 };
btable tn1_lo = { 0,1,2,3, 0,1,2,3,  4,5,2,3, 0,1,2,3 };
btable tn1_bp = { N_C3,0,N_G3,0,N_C3,0,N_G3,0,   N_G2,0,N_D3,0,N_G2,0,N_D3,0,   N_A2,0,N_E3,0,N_A2,0,N_E3,0,   N_F2,0,N_C3,0,N_F2,0,N_C3,0 };
btable tn1_bo = { 0,1,2,3, 0,1,2,3, 0,1,2,3, 0,1,2,3 };
// action: A minor, driving
btable tn2_lp = { N_A4,0,N_C5,N_A4,0,N_E5,N_D5,N_C5,   N_G4,0,N_B4,N_G4,0,N_D5,N_C5,N_B4,   N_F4,0,N_A4,N_F4,0,N_C5,N_B4,N_A4,   N_E4,0,N_GS4,N_B4,0,N_E5,N_B4,N_GS4,
                  N_E5,0,N_E5,N_D5,N_C5,0,N_D5,N_E5,   N_D5,0,N_D5,N_C5,N_B4,0,N_C5,N_D5,   N_C5,0,N_C5,N_B4,N_A4,0,N_B4,N_C5,   N_B4,N_B4,0,N_GS4,N_B4,0,N_E5,0 };
btable tn2_lo = { 0,1,2,3, 0,1,2,3,  4,5,6,7, 4,5,6,7,  0,1,2,3, 0,1,2,3 };
btable tn2_bp = { N_A2,N_A2,0,N_A2,N_E3,0,N_A2,0,   N_G2,N_G2,0,N_G2,N_D3,0,N_G2,0,   N_F2,N_F2,0,N_F2,N_C3,0,N_F2,0,   N_E2,N_E2,0,N_E2,N_B2,0,N_E2,0 };
btable tn2_bo = { 0,1,2,3, 0,1,2,3, 0,1,2,3, 0,1,2,3, 0,1,2,3, 0,1,2,3 };
// boss: D minor, fast and tense
btable tn3_lp = { N_D5,N_D5,N_F5,N_D5,N_A5,N_D5,N_F5,N_D5,   N_D5,N_D5,N_F5,N_D5,N_AS5,N_D5,N_F5,N_D5,   N_C5,N_C5,N_E5,N_C5,N_G5,N_C5,N_E5,N_C5,   N_A5,0,N_G5,0,N_F5,0,N_E5,0 };
btable tn3_lo = { 0,0,1,0, 0,0,1,2, 0,0,1,0, 0,3,2,3 };
btable tn3_bp = { N_D3,N_D3,0,N_D3,N_D3,0,N_D3,N_F3,   N_D3,N_D3,0,N_D3,N_D3,0,N_AS2,N_D3,   N_C3,N_C3,0,N_C3,N_C3,0,N_C3,N_E3,   N_A2,0,N_A2,0,N_A2,N_A2,N_CS3,N_E3 };
btable tn3_bo = { 0,0,1,0, 0,0,1,2, 0,0,1,0, 0,3,2,3 };
// space: E minor, spacious
btable tn4_lp = { N_E5,0,0,0,N_B4,0,N_G5,0,   N_D5,0,0,0,N_A4,0,N_FS5,0,   N_C5,0,0,0,N_G4,0,N_E5,0,   N_B4,0,0,0,N_FS4,0,N_DS5,0 };
btable tn4_lo = { 0,1,2,3, 0,1,2,3, 0,1,2,3, 0,1,2,3 };
btable tn4_bp = { N_E2,0,0,0,N_B2,0,0,0,   N_D3,0,0,0,N_A2,0,0,0,   N_C3,0,0,0,N_G2,0,0,0,   N_B2,0,0,0,N_FS2,0,0,0 };
func tune_play(id) {
  music_stop_all();
  if (id == TUNE_TITLE) { music_tempo(11); music_build(tune_lead, tn0_lp, 8, tn0_lo, 16); music_build(tune_bass, tn0_bp, 8, tn0_lo, 16); }
  else if (id == TUNE_ADVENTURE) { music_tempo(9); music_build(tune_lead, tn1_lp, 8, tn1_lo, 16); music_build(tune_bass, tn1_bp, 8, tn1_bo, 16); }
  else if (id == TUNE_ACTION) { music_tempo(7); music_build(tune_lead, tn2_lp, 8, tn2_lo, 24); music_build(tune_bass, tn2_bp, 8, tn2_bo, 24); }
  else if (id == TUNE_BOSS) { music_tempo(5); music_build(tune_lead, tn3_lp, 8, tn3_lo, 16); music_build(tune_bass, tn3_bp, 8, tn3_bo, 16); }
  else { music_tempo(12); music_build(tune_lead, tn4_lp, 8, tn4_lo, 16); music_build(tune_bass, tn4_bp, 8, tn4_lo, 16); }
  music_play(0, 0, tune_lead, 7);
  music_play(1, 2, tune_bass, 8);
}
func tune_stop() { music_stop_all(); }
`;

const FADE_SOURCE = `
// std/fade: fade the whole screen to black and back by scaling every palette colour (4 = normal ... 0 = black).
//   set your palettes (bg_pal, obj_pal), then fade_save();            // remember the real colours
//   fade_set(0); fade_to(4, 6);                                       // start black and fade in, one step every 6 frames
//   fade_to(0, 6);                                                    // fade out ...
//   func frame() { fade_update(); if (!fade_busy()) { change_screen(); fade_to(4, 6); } }
// fade_set(n) jumps straight to a level and stays there (it also sets the target). To change colours while the screen is faded or fading,
// write them with fade_bg_set(i, colour) / fade_obj_set(i, colour) (i is the palette entry 0-31; they update the remembered colour and show it
// at the current level). Do NOT write bg_pal/obj_pal and then call fade_save() while faded: fade_save restores the OLD colours first (so it can
// never store black), and your new palettes are lost. About 15,000 cycles a step; changing a whole screen's palettes with the two set
// functions and one fade_to costs far less than fade_save plus fade_set.
var fade_bg[32]; var fade_obj[32];
var fade_level = 4; var fade_target = 4; var fade_wait; var fade_speed = 6; var fade_saved;
func fade_save() {
  if (fade_level != 4 && fade_saved) { fade_apply(4); }          // never remember faded colours as the real ones
  fade_saved = 1;
  for (var i = 0; i < 32; i++) { fade_bg[i] = peek(BG_PAL + i * 2); fade_obj[i] = peek(OBJ_PAL + i * 2); }
  fade_level = 4; fade_target = 4;
}
func fade_scale(c, n) {
  var r = ((c >> 8) & 15) * n / 4;
  var g = ((c >> 4) & 15) * n / 4;
  var b = (c & 15) * n / 4;
  return (r << 8) | (g << 4) | b;
}
func fade_apply(n) {
  fade_level = n;
  for (var i = 0; i < 32; i++) { poke(BG_PAL + i * 2, fade_scale(fade_bg[i], n)); poke(OBJ_PAL + i * 2, fade_scale(fade_obj[i], n)); }
}
func fade_set(n) { fade_apply(n); fade_target = n; }
func fade_bg_set(i, c) { fade_bg[i] = c; poke(BG_PAL + i * 2, fade_scale(c, fade_level)); }
func fade_obj_set(i, c) { fade_obj[i] = c; poke(OBJ_PAL + i * 2, fade_scale(c, fade_level)); }
func fade_to(target, frames_per_step) { fade_target = target; fade_speed = frames_per_step; fade_wait = 0; }
func fade_busy() { return fade_level != fade_target; }
func fade_update() {
  if (fade_level == fade_target) { return; }
  fade_wait++;
  if (fade_wait >= fade_speed) {
    fade_wait = 0;
    if (fade_level < fade_target) { fade_apply(fade_level + 1); } else { fade_apply(fade_level - 1); }
  }
}
`;


const FLOW_SOURCE = `
// std/flow: the pieces every game's front end and controls need, so they are the same everywhere.
//  - buttons: taps, holds and releases told apart (bt_*)
//  - confirm: "erase your progress?" with KEEP as the default (confirm_*)
//  - progress: a grade (D to AAA) for each level, kept in the save (pg_*, grade_*)
//  - grid: a level-select grid cursor (grid_*)
// The common menu pattern is in std/ui: UP/DOWN move, A or START choose, B goes back. Needs std/ui and load_font().
import "std/ui";

// ---- buttons ----
// Call bt_update() first thing in frame(). Then, for a button mask such as BTN_B:
//   bt_tap(b)       1 on the frame the button is RELEASED after a short press (12 frames or fewer)
//   bt_hold(b, n)   1, once, on the frame the button has been held n frames (it never fires again until released)
//   bt_released(b)  1 on the frame the button is released
//   bt_frames(b)    how many frames it has been held (0 when it is not held)
//   bt_flush()      ignore every button that is held right now until it is released (call it when the screen changes)
const BT_TAP = 12;
var bt_n[8];
var bt_c[8];
var bt_f[8];
var bt_rel[8];
func bt_i(m) {
  var i = 0;
  while (m > 1) { m = m >> 1; i++; }
  return i;
}
func bt_update() {
  for (var i = 0; i < 8; i++) {
    bt_rel[i] = 0;
    if (btn(1 << i)) {
      if (bt_n[i] < 250) { bt_n[i]++; }
    } else {
      if (bt_n[i] > 0 && bt_c[i] == 0) { bt_rel[i] = bt_n[i]; }
      bt_n[i] = 0; bt_c[i] = 0; bt_f[i] = 0;
    }
  }
}
func bt_frames(m) {
  var i = bt_i(m);
  if (bt_c[i]) { return 0; }
  return bt_n[i];
}
func bt_released(m) { return bt_rel[bt_i(m)] > 0; }
func bt_tap(m) {
  var r = bt_rel[bt_i(m)];
  return r > 0 && r <= BT_TAP;
}
func bt_hold(m, n) {
  var i = bt_i(m);
  if (bt_c[i] || bt_f[i] || bt_n[i] < n) { return 0; }
  bt_f[i] = 1;
  return 1;
}
func bt_flush() {
  for (var i = 0; i < 8; i++) { if (bt_n[i] > 0) { bt_c[i] = 1; } }
}

// ---- confirm: a two-choice box, KEEP or ERASE ----
// confirm_open(map, col, row, title, warning) draws it with KEEP selected. Call confirm_update() every frame:
// -1 while waiting, 0 when the player keeps (chooses KEEP, or presses B), 1 when the player confirms ERASE.
// LEFT/RIGHT or UP/DOWN move, A or START choose, B cancels. Name exactly what will be erased in title and warning.
var cf_map;
var cf_col;
var cf_row;
var cf_w;
var cf_sel;
func confirm_draw_choices() {
  var x = cf_col + (cf_w - 13) / 2;
  put_text(cf_map, x + 1, cf_row + 5, "KEEP");
  put_text(cf_map, x + 8, cf_row + 5, "ERASE");
  var keep = font_base;
  var erase = font_base;
  if (cf_sel == 0) { keep = ui_base + ui_tiles_ui_cursor + (text_pal << 12); } else { erase = ui_base + ui_tiles_ui_cursor + (text_pal << 12); }
  poke(cf_map + (cf_row + 5) * 64 + x * 2, keep);
  poke(cf_map + (cf_row + 5) * 64 + (x + 7) * 2, erase);
}
func confirm_open(map, col, row, title, warning) {
  cf_map = map; cf_col = col; cf_row = row; cf_sel = 0;
  cf_w = max(max(ui_strlen(title), ui_strlen(warning)), 14) + 4;
  ui_box(map, col, row, cf_w, 7);
  put_text(map, col + (cf_w - ui_strlen(title)) / 2, row + 1, title);
  put_text(map, col + (cf_w - ui_strlen(warning)) / 2, row + 3, warning);
  confirm_draw_choices();
}
func confirm_update() {
  if (btnp(BTN_LEFT) || btnp(BTN_RIGHT) || btnp(BTN_UP) || btnp(BTN_DOWN)) { cf_sel = 1 - cf_sel; confirm_draw_choices(); }
  if (btnp(BTN_B)) { return 0; }
  if (btnp(BTN_A) || btnp(BTN_START)) { return cf_sel; }
  return -1;
}
func confirm_close() { ui_clear(cf_map, cf_col, cf_row, cf_w, 7); }

// ---- progress: a grade for each level, 4 bits each, in the save ----
// grade 0 = not beaten yet, 1 = D, 2 = C, 3 = B, 4 = A, 5 = AA, 6 = AAA. Level numbers start at 0.
// The grades live from save byte pg_base on (up to 1,900 levels fit before the checksum). The game keeps bytes below pg_base for itself.
var pg_base = 64;
func pg_get(level) {
  var b = save_get8(pg_base + (level >> 1));
  if (level & 1) { return b >> 4; }
  return b & 15;
}
func pg_set(level, g) {
  var a = pg_base + (level >> 1);
  var b = save_get8(a);
  if (level & 1) { save_set8(a, (b & 15) | (g << 4)); } else { save_set8(a, (b & 240) | g); }
}
// Keep the best grade. Returns 1 when this is a new best (or the first time the level is beaten). Call pg_save() afterwards.
func pg_record(level, g) {
  if (g > pg_get(level)) { pg_set(level, g); return 1; }
  return 0;
}
func pg_save() { save_seal(); save_commit(); }
// The first level that has not been beaten (count when all are), and how many are beaten.
func pg_next(count) {
  for (var i = 0; i < count; i++) { if (pg_get(i) == 0) { return i; } }
  return count;
}
func pg_beaten(count) {
  var n = 0;
  for (var i = 0; i < count; i++) { if (pg_get(i) > 0) { n++; } }
  return n;
}
// Progressive unlocking: every beaten level and the next one are open.
func pg_open(level, count) { return level <= pg_next(count); }
// Grade from the turns taken and the minimum possible (par): AAA at par, then a little more slack for each step down.
func grade_for(turns, par) {
  var over = turns - par;
  var slack = max(1, par / 8);
  if (over <= 0) { return 6; }
  if (over <= slack) { return 5; }
  if (over <= slack * 2) { return 4; }
  if (over <= slack * 4) { return 3; }
  if (over <= slack * 8) { return 2; }
  return 1;
}
func grade_name(g) {
  if (g == 6) { return "AAA"; }
  if (g == 5) { return "AA"; }
  if (g == 4) { return "A"; }
  if (g == 3) { return "B"; }
  if (g == 2) { return "C"; }
  if (g == 1) { return "D"; }
  return "-";
}

// ---- grid: a level-select cursor ----
// grid_open(cols, count, start) puts the cursor on start. grid_update(unlocked) returns -1 while nothing is chosen, the level when A or START
// is pressed on an open level, -3 on a locked one, -2 on B. Arrows move the cursor (no wrap). grid_sel is the cursor; draw the cells yourself.
var grid_cols;
var grid_count;
var grid_sel;
func grid_open(cols, count, start) { grid_cols = cols; grid_count = count; grid_sel = start; }
func grid_update(unlocked) {
  if (btnp(BTN_RIGHT) && grid_sel < grid_count - 1) { grid_sel++; }
  if (btnp(BTN_LEFT) && grid_sel > 0) { grid_sel--; }
  if (btnp(BTN_DOWN) && grid_sel + grid_cols < grid_count) { grid_sel = grid_sel + grid_cols; }
  if (btnp(BTN_UP) && grid_sel >= grid_cols) { grid_sel = grid_sel - grid_cols; }
  if (btnp(BTN_B)) { return -2; }
  if (btnp(BTN_A) || btnp(BTN_START)) {
    if (grid_sel <= unlocked) { return grid_sel; }
    return -3;
  }
  return -1;
}
`;

const PLATFORMER_SOURCE = `
// ===== std/platformer: Super Mario Bros. movement, collision and jumping =====
// Write one function in your game:   func pl_solid(x, y) { return ...; }   1 if the world pixel (x, y) is solid, else 0.
// Then each frame:   pl_step(dir, run, jump_pressed, jump_held);   and draw a sprite at (pl_x - 2, pl_y) for the default 12 x 16 body.
// The numbers are SMB1's own (see docs/ref-sidescroller.md): walk 1.5 px/frame, run 2.5, jump 4 blocks with A held, a tap still hops a block.
// Positions are whole pixels (pl_x, pl_y: the top-left of the body) plus remainders, so a 1,920-pixel world works.
var pl_x; var pl_y; var pl_fx; var pl_fy;
var pl_vx;                   // 1/4096 pixel per frame (6144 = 1.5 px/frame)
var pl_vy;                   // 1/256 pixel per frame
var pl_w = 12; var pl_h = 16;
var pl_face = 1;             // 1 faces right, -1 left
var pl_ground;               // 1 while standing on something
var pl_rt;                   // run timer: the run speed is kept for 10 frames after B is let go
var pl_coyote; var pl_jbuf;
var pl_gu = 32; var pl_gd = 112;     // gravity while rising with A held, and otherwise (1/256 px/frame per frame)
var pl_coyote_max = 4;       // frames after walking off a ledge in which a jump still works (0 = strict SMB1)
var pl_buffer_max = 5;       // frames a jump press is remembered before landing (0 = strict SMB1)
var pl_nudge = 4;            // a head that clips a block's corner by this many pixels or less slides round it
var pl_inset = 2;            // feet need to overlap a ledge by more than this many pixels to stand on it
var pl_bump;                 // 1 on the frame the head hit something; pl_bx, pl_by say where (pixels)
var pl_bx; var pl_by;
var pl_jumped;               // 1 on the frame a jump started (play the sound)
var pl_landed;               // 1 on the frame the feet touched down (play the thud, puff the dust)

func pl_init(x, y) { pl_cam = x - pl_cam_line; if (pl_cam < 0) { pl_cam = 0; } pl_x = x; pl_y = y; pl_fx = 0; pl_fy = 0; pl_vx = 0; pl_vy = 0; pl_ground = 0; pl_rt = 0; pl_coyote = 0; pl_jbuf = 0; pl_gu = 32; pl_gd = 112; }

func pl_col(x, y0, h) {      // anything solid on the vertical line x, from y0 down h pixels (every 8 px, and the last)
  var r = 0;
  while (r < h - 1) { if (pl_solid(x, y0 + r)) { return 1; } r += 8; }
  return pl_solid(x, y0 + h - 1);
}
func pl_row(y, x0, w) {      // anything solid on the horizontal line y, from x0 across w pixels
  var r = 0;
  while (r < w - 1) { if (pl_solid(x0 + r, y)) { return 1; } r += 8; }
  return pl_solid(x0 + w - 1, y);
}
func pl_move_x(d) {
  var c = pl_x + pl_w;
  if (d < 0) { c = pl_x - 1; }
  if (pl_col(c, pl_y, pl_h)) { return 0; }
  pl_x += d;
  return 1;
}

func pl_hstep(dir, b) {
  var mv = 0;
  if (pl_vx > 0) { mv = 1; } else if (pl_vx < 0) { mv = -1; }
  var av = abs(pl_vx);
  if (pl_ground) { if (b && dir != 0 && dir == mv) { pl_rt = 10; } else if (pl_rt > 0) { pl_rt--; } }
  if (dir == 0) {
    if (pl_ground && mv != 0) {                       // let go: slide to a stop (the air keeps its speed)
      var f = 152;
      if (av >= 7168) { f = 208; }
      if (av <= f) { pl_vx = 0; } else { pl_vx -= mv * f; }
    }
  } else {
    pl_face = dir;
    var a = 152;                                      // walking acceleration
    if (b || pl_rt > 0) { a = 228; }                  // running
    if (!pl_ground) { a = 152; if (av >= 6400) { a = 228; } }
    if (mv != 0 && dir != mv) {                       // pushing against the motion: skid, twice as hard
      if (av < 2816) { pl_vx = 0; a = 152; }          // slow enough to turn on the spot
      else { a = 304; if (av >= 7168) { a = 416; } }
    }
    pl_vx += dir * a;
    var cap = 6144;
    if (pl_rt > 0) { cap = 10240; }
    if (dir == mv || mv == 0) { if (abs(pl_vx) > cap) { pl_vx = dir * cap; } }   // the walking cap snaps back once B has been let go for 10 frames
  }
  var tot = pl_fx + pl_vx;
  var steps = tot >> 12;
  pl_fx = tot & 4095;
  while (steps > 0) { if (!pl_move_x(1)) { pl_vx = 0; pl_fx = 0; break; } steps--; }
  while (steps < 0) { if (!pl_move_x(-1)) { pl_vx = 0; pl_fx = 0; break; } steps++; }
  if (pl_vx != 0) {                                   // flush against a wall: no speed left (SMB1 zeroes it too)
    var c = pl_x + pl_w;
    if (pl_vx < 0) { c = pl_x - 1; }
    if (pl_col(c, pl_y, pl_h)) { pl_vx = 0; pl_fx = 0; }
  }
}

func pl_up() {                                        // one pixel up; 0 if something is in the way (after trying to slide round a corner)
  var row = pl_y - 1;
  if (!pl_row(row, pl_x, pl_w)) { pl_y--; return 1; }
  var d = 1;
  if (pl_vx < 0) { d = -1; }
  var tries = 0;
  while (tries < 2) {
    var n = 0; var ok = 0;
    while (n < pl_nudge) {
      if (!pl_move_x(d)) { break; }
      n++;
      if (!pl_row(row, pl_x, pl_w)) { ok = 1; break; }
    }
    if (ok) { pl_y--; return 1; }
    pl_x -= d * n;
    d = -d; tries++;
  }
  pl_bx = pl_x + (pl_w >> 1); pl_by = row;
  return 0;
}

func pl_vstep(jp, jh) {
  pl_landed = 0; pl_jumped = 0;
  if (pl_vy >= 0) {
    var on = pl_row(pl_y + pl_h, pl_x + pl_inset, pl_w - pl_inset * 2);
    if (on && !pl_ground) { pl_landed = 1; }
    pl_ground = on;
  }
  // pl_coyote_max + 1: the counter drops on the first frame in the air, so pl_coyote_max is the number of airborne frames a jump still works
  if (pl_ground) { pl_coyote = pl_coyote_max + 1; pl_vy = 0; pl_fy = 0; } else if (pl_coyote > 0) { pl_coyote--; }
  if (jp) { pl_jbuf = pl_buffer_max; } else if (pl_jbuf > 0) { pl_jbuf--; }
  if ((jp || pl_jbuf > 0) && (pl_ground || pl_coyote > 0)) {
    var av = abs(pl_vx);
    pl_vy = -1024; pl_gu = 32; pl_gd = 112;                                   // SMB1: faster on the ground, higher and heavier
    if (av >= 6400) { pl_vy = -1280; pl_gu = 40; pl_gd = 144; }
    else if (av >= 4096) { pl_gu = 30; pl_gd = 96; }
    pl_fy = 0; pl_ground = 0; pl_coyote = 0; pl_jbuf = 0; pl_jumped = 1;
  }
  if (pl_ground) { return; }
  var g = pl_gd;
  if (pl_vy < 0 && jh) { g = pl_gu; }                                          // holding A keeps the light gravity while rising
  pl_vy = min(pl_vy + g, 1024);
  var tot = pl_fy + pl_vy;
  var steps = tot >> 8;
  pl_fy = tot & 255;
  while (steps < 0) {
    if (!pl_up()) { pl_vy = 256; pl_fy = 0; pl_bump = 1; break; }              // bonk: start falling at once
    steps++;
  }
  while (steps > 0) {
    if (pl_row(pl_y + pl_h, pl_x + pl_inset, pl_w - pl_inset * 2)) { pl_ground = 1; pl_landed = 1; pl_vy = 0; pl_fy = 0; break; }
    pl_y++; steps--;
  }
}

// Is any part of the body inside something solid? (a block that switched on, a platform that moved, a spawn point in a wall)
func pl_hit() {
  var r = 0;
  while (r < pl_h - 1) { if (pl_row(pl_y + r, pl_x, pl_w)) { return 1; } r += 8; }
  return pl_row(pl_y + pl_h - 1, pl_x, pl_w);
}
// Last resort when pl_unstick cannot float up: the nearest free spot, looking up first, then right, then left, one pixel further each time.
func pl_eject() {
  var x0 = pl_x; var y0 = pl_y;
  var d = 1;
  while (d <= 32) {
    pl_x = x0; pl_y = y0 - d; if (!pl_hit()) { pl_vy = 0; pl_fy = 0; return 1; }
    pl_y = y0; pl_x = x0 + d; if (!pl_hit()) { pl_vx = 0; pl_fx = 0; return 1; }
    pl_x = x0 - d; if (!pl_hit()) { pl_vx = 0; pl_fx = 0; return 1; }
    d++;
  }
  pl_x = x0; pl_y = y0;
  return 0;
}

// Squeezed into something solid, SMB1 style: ImpedePlayerMove moves the character 1 pixel per frame sideways, away from the side whose probe
// touched a solid, and zeroes its speed; it never teleports. SMB1 never puts a block on Mario, so a character buried on BOTH sides is our case:
// float up 1 pixel per frame (and if the ceiling is in the way, fall back to the nearest free spot, pl_eject). Called by pl_step.
func pl_unstick() {
  var l = pl_col(pl_x, pl_y, pl_h);                  // the outermost columns of the body: any overlap at all is seen
  var r = pl_col(pl_x + pl_w - 1, pl_y, pl_h);
  if (l && !r) { pl_x++; if (pl_vx < 0) { pl_vx = 0; pl_fx = 0; } return; }
  if (r && !l) { pl_x--; if (pl_vx > 0) { pl_vx = 0; pl_fx = 0; } return; }
  if (!pl_row(pl_y - 1, pl_x, pl_w)) { pl_y--; pl_vy = 0; pl_fy = 0; return; }
  pl_eject();
}

// The camera, the way SMB1 does it: it follows the character only when the character is more than pl_cam_line pixels in from the left
// edge of the screen, moves exactly as far as the character moved that frame (whole pixels, no easing, so the sprite never wobbles),
// never scrolls back, and stops at the end of the world; the character cannot walk off the left of the screen.
// Call it once per frame right after pl_step, then draw everything with the same pl_cam.
var pl_cam; var pl_cam_line = 70;
func pl_camera(world_w) {
  if (pl_x - pl_cam > pl_cam_line) { pl_cam = pl_x - pl_cam_line; }
  if (pl_cam > world_w - 160) { pl_cam = world_w - 160; }
  if (pl_cam < 0) { pl_cam = 0; }
  if (pl_x < pl_cam) { pl_x = pl_cam; pl_vx = 0; pl_fx = 0; }
  if (pl_x > world_w - pl_w) { pl_x = world_w - pl_w; pl_vx = 0; pl_fx = 0; }
}

// Enemy contact, the way SMB1 judges it (see docs/ref-sidescroller.md "Enemy contact"): when in doubt the player wins.
//   pl_enemy(ex, ey, ew, eh) -> 0 no contact, 1 the character stomps it (kill it, then call pl_bounce()), 2 the character is hurt (call pl_hurt()).
// A contact is a STOMP when the character is falling at all (pl_vy > 0: SMB1 has no height test for a falling character), or has just landed with the
// feet in the top half of the enemy, or stomped something within the last few frames (the SMB1 stomp timer: two enemies side by side both die).
// Otherwise (walking into it, rising into it from below) it is a hurt, unless the character is still blinking from the last one (pl_inv > 0).
// The boxes are a little smaller than the sprites (pl_hurt_inset pixels off each side of the character, 1 off the enemy), so a graze is not a hit.
var pl_inv;                  // frames of invulnerability left (blinking); counts down in pl_step
var pl_stomp_t;              // frames in which a second contact still counts as a stomp
var pl_hurt_inset = 2;
var pl_inv_max = 168;        // SMB1's own: an injury timer of 8, counted down once per 21 frames (about 2.8 seconds)
func pl_enemy(ex, ey, ew, eh) {
  var px0 = pl_x + pl_hurt_inset; var px1 = pl_x + pl_w - pl_hurt_inset;
  var py0 = pl_y + 2; var py1 = pl_y + pl_h;
  if (px1 <= ex + 1 || px0 >= ex + ew - 1 || py1 <= ey || py0 >= ey + eh) { return 0; }
  if (pl_vy > 0 || pl_stomp_t > 0) { return 1; }
  if (pl_vy >= 0 && py1 <= ey + eh / 2 + 2) { return 1; }    // standing or landing with the feet in the top half of it
  if (pl_inv > 0) { return 0; }
  return 2;
}
func pl_hurt() { pl_inv = pl_inv_max; }                     // the character was hit: blink, and ignore enemies (but not stomp them) for pl_inv_max frames

// One frame of Mario: dir -1, 0 or 1 (the D-pad), run (B held), jump_pressed (A went down this frame), jump_held (A is down).
func pl_step(dir, run, jump_pressed, jump_held) {
  pl_bump = 0;
  if (pl_inv > 0) { pl_inv--; }
  if (pl_stomp_t > 0) { pl_stomp_t--; }
  if (pl_hit()) { pl_unstick(); }
  pl_hstep(dir, run);
  pl_vstep(jump_pressed, jump_held);
}
// Landed on an enemy: spring off it (SMB1: the same hop whatever the buttons).
func pl_bounce() { pl_vy = -1024; pl_fy = 0; pl_ground = 0; pl_coyote = 0; pl_stomp_t = 6; }
`;

export const MODULES = {
  'std/ui': { source: UI_SOURCE, files: { 'std/ui.tiles': UI_TILES } },
  'std/anim': { source: ANIM_SOURCE, files: {} },
  'std/music': { source: MUSIC_SOURCE, files: {} },
  'std/sprites': { source: SPRITES_SOURCE, files: {} },
  'std/sfx': { source: SFX_SOURCE, files: {} },
  'std/stream': { source: STREAM_SOURCE, files: {} },
  'std/tunes': { source: TUNES_SOURCE, files: {} },
  'std/fade': { source: FADE_SOURCE, files: {} },
  'std/flow': { source: FLOW_SOURCE, files: {} },
  'std/platformer': { source: PLATFORMER_SOURCE, files: {} },
};

/** Embedded files (such as module art) by path. */
export const MODULE_FILES = Object.assign({}, ...Object.values(MODULES).map((m) => m.files));
