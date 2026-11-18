// VLY-1 prototype handheld: a printable landscape shell for a Bambu A1 mini (180 x 180 x 180 mm bed).
// Parts print without supports, flat side down. Pick one with  -D 'part="front"'  (see the list at the bottom).
// Units are millimetres. Everything that depends on a part you buy is a named parameter, so change the number, not the shape.
//
//   openscad -o front.stl -D 'part="front"' vly1-handheld.scad     (or run  make -C hardware enclosure  for all parts)
//
// Prototype stack (docs/hardware-plan.md): 3.5" 480x320 module, a Pico 2 class board or the custom PCB, two AA cells in a
// holder reached through a door in the back, 40 mm speaker, eight 6.0 x 3.5 x 4.3 tact switches (real dimensions: hardware/parts-dimensions.md), a cartridge slot
// on the top edge. About 30 mm thick, because of the AA cells (a LiPo version would be 21 mm).

$fn = 48;

// ---- what you bought ----
lcd_w = 84.07; lcd_h = 54.34; lcd_t = 3.3;     // the 3.5" panel glass, from the panel drawing (Adafruit35inTFT.pdf): outline 84.07 x 54.34 +-0.2, 3.3 +-0.2 thick. The breakout PCB behind it is 96.5 x 56 mm (66 mm across its corner ears), 2 mm thick
view_w = 74.2; view_h = 49.4;                  // visible window: between the active area (73.44 x 48.96) and the touch panel's viewing area (75.09 x 49.96), from the panel drawing
view_dx = 0;   view_dy = 0;                    // shift the window if the panel's active area is off centre
bat_l = 68.2;  bat_w = 34.4; bat_t = 18.8;     // the 2 x AA holder, Adafruit 4193: 68.2 x 34.4 x 18.8 mm (the page does not say which is which; length > width > height assumed)
open_l = 54;   open_w = 31.5;                  // the opening in the back that the cells drop through (cells are 50.5 long, 14.5 across)
bat_cx = -20;  bat_cy = -19.5;                  // where the cells sit (centre), clear of the cartridge guide above
spk_x = 44;    spk_y = -17;                    // where the speaker sits (centre), bottom right
spk_d = 40.0;  spk_t = 5.0;                    // Adafruit 1891 thin speaker: 40 mm outside diameter (datasheet); the thickness is not given: 5.0 is a guess, measure it
pcb_w = 134;   pcb_h = 70;   pcb_t = 1.6;      // main board, landscape
sw = 6.0;      sw_w = 3.5;  sw_t = 4.3;        // tact switch (Adafruit 1489, datasheet C1779-001): 6.0 x 3.5 body, 4.3 tall to the top of the button, 0.25 travel
cart_w = 30.0; cart_t = 4.0; cart_len = 36.0;  // the cartridge (see cartridge() below)
pw_x = -48;                                    // power slider: on the top edge, left of the cartridge, like the original Game Boy
// Haoyu SS-12E17 slide switch (Adafruit 805), from its datasheet drawing: body 11.6 long (along the slide) x 6.0 deep x 4.1 wide, lever 4.6 long x 2.1 thick, travel 2.5, pins on a 2.5 mm pitch.
// The lever length above the body is not given in the drawing (X): 2.5 is a guess, measure it.
pw_l = 11.6;  pw_w = 6.0;  pw_t = 4.1;         // body: along the slide, depth toward the lever, width
pw_lever = 2.5; pw_lever_l = 4.6; pw_lever_t = 2.1;   // lever length above the body (guess), its size along the slide and across
pw_travel = 2.5;                               // lever travel between OFF and ON

// ---- the shell ----
body_w = 150;  body_h = 82;                    // outside size; the thickness (body_t) is worked out below from the battery holder
wall = 2.2;
corner = 9;                                    // plan-view corner radius
split = 11.0;                                  // front shell depth: screen module and main board; the back (the rest) holds the battery, speaker and cartridge
tol = 0.25;                                    // sliding fit; the A1 mini is good to about +-0.15
screw_d = 2.6; screw_post = 6.0;               // M2.5 self-tapping into the posts, 4 of them
body_t = split + wall + bat_t + 1;             // about 30 mm: front shell, then the battery holder, then the back wall

// ---- controls (offsets from the body centre) ----
dpad_x = -52;  dpad_y = -2;  dpad_arm = 12;    // d-pad cross
a_x = 55; a_y = -8;  b_x = 44; b_y = -17;  btn_d = 11;
ss_x = 0; ss_y = -31;  ss_w = 13; ss_h = 5;    // START and SELECT, side by side
ss_gap = 9;

module rrect(w, h, r, t) { linear_extrude(t) offset(r) square([w - 2 * r, h - 2 * r], center = true); }
module outline(t, grow = 0) { rrect(body_w + 2 * grow, body_h + 2 * grow, corner + grow, t); }

module post_xy() { for (sx = [-1, 1], sy = [-1, 1]) translate([sx * (body_w / 2 - 11), sy * (body_h / 2 - 8), 0]) children(); }

// ---- front shell: prints screen side down on the bed, so the window and the button holes are in the first layer ----
module front() {
  difference() {
    union() {
      difference() { outline(split); translate([0, 0, wall]) outline(split, -wall); }
      post_xy() translate([0, 0, wall - 0.01]) cylinder(d = screw_post, h = split - wall + 0.01);
    }
    translate([view_dx, view_dy, 0]) cube([view_w, view_h, wall * 3], center = true);                     // the picture
    translate([0, 0, wall + (lcd_t + 0.4) / 2 - 0.01]) cube([lcd_w + 0.6, lcd_h + 0.6, lcd_t + 0.4], center = true);   // the module sits in this recess
    for (a = [0, 90]) translate([dpad_x, dpad_y, 0]) rotate(a) cube([dpad_arm * 2 + 2 * tol + 2, 6 + 2 * tol, wall * 3], center = true);   // d-pad cross
    for (p = [[a_x, a_y], [b_x, b_y]]) translate([p[0], p[1], 0]) cylinder(d = btn_d + 2 * tol, h = wall * 3, center = true);
    for (s = [-1, 1]) translate([ss_x + s * ss_gap, ss_y, 0]) cube([ss_w + 2 * tol, ss_h + 2 * tol, wall * 3], center = true);
    post_xy() translate([0, 0, split - 9]) cylinder(d = screw_d - 0.4, h = 9.1);                         // pilot holes for the screws
  }
}

// ---- back shell: prints rear face down; its open side faces the front shell ----
bt = body_t - split;
ct = cart_t + 2 * tol;                 // cartridge channel height
cz = bt - ct - 0.4;                    // channel floor, measured from the rear face: the cartridge rides next to the main board
module cart_guide() {                   // a block with a channel, joined to the rear wall and to the top edge
  difference() {
    translate([-(cart_w + 2 * tol + 2 * wall) / 2, body_h / 2 - wall - cart_len - 1, wall - 0.01]) cube([cart_w + 2 * tol + 2 * wall, cart_len + 1 + wall, bt - wall + 0.01]);
    translate([-(cart_w + 2 * tol) / 2, body_h / 2 - wall - cart_len, cz]) cube([cart_w + 2 * tol, cart_len + 2 * wall, ct]);
  }
}
module back() {
  difference() {
    union() {
      difference() { outline(bt); translate([0, 0, wall]) outline(bt, -wall); }
      post_xy() cylinder(d = screw_post, h = bt);
      intersection() { translate([0, 0, 0]) outline(bt, -wall / 2); cart_guide(); }
      battery_cradle();
      power_cradle();
      translate([spk_x, spk_y, wall - 0.01]) difference() { cylinder(d = spk_d + 3, h = spk_t + 1); translate([0, 0, -0.1]) cylinder(d = spk_d + 0.6, h = spk_t + 2); }   // a ring that holds the speaker
    }
    post_xy() translate([0, 0, -0.1]) cylinder(d = screw_d + 0.4, h = bt + 0.2);                          // screws come in from the back
    post_xy() translate([0, 0, -0.1]) cylinder(d1 = 5.4, d2 = screw_d + 0.4, h = 2.5);                    // countersink
    for (i = [-3 : 3]) translate([spk_x + i * 4.6 - 0.8, spk_y - 9, -0.1]) cube([1.6, 18, wall + 0.2]);       // speaker grille
    translate([pw_x, body_h / 2 - wall - 0.5, wall + pw_t / 2 + 2]) cube([pw_travel + pw_lever_l + 2.8 + 0.6, wall * 3, pw_t + 1], center = true);   // the power slider slot in the top edge
    translate([-(cart_w + 2 * tol) / 2, body_h / 2 - wall - 1, cz]) cube([cart_w + 2 * tol, wall * 3, ct]);   // the cartridge slot in the top edge
    translate([bat_cx, bat_cy, -0.1]) cube([open_l, open_w, wall * 3], center = true);                        // the battery opening
    door_bosses() translate([0, 0, wall]) cylinder(d = screw_d - 0.4, h = 9);                                // pilot holes for the door screws
  }
}

// a block under the top edge with a pocket for the bought slide switch (open at the top: it drops in from above); its lever points at the slot
module power_cradle() {
  yt = body_h / 2 - wall;                            // inside face of the top edge
  face = yt - (pw_lever + 0.8);                      // the lever-side face of the switch body
  translate([pw_x, 0, wall - 0.01]) difference() {
    translate([-(pw_l + 6) / 2, face - pw_w - 1.5, 0]) cube([pw_l + 6, yt - (face - pw_w - 1.5) + 0.01, 2 + pw_t + 3]);
    translate([-(pw_l + 0.4) / 2, face - pw_w - 0.2, 2]) cube([pw_l + 0.4, pw_w + 0.4, pw_t + 4]);                      // the switch body
    translate([-(pw_travel + pw_lever_l + 1) / 2, face - 0.1, 2]) cube([pw_travel + pw_lever_l + 1, yt - face + 0.2, pw_t + 4]);   // room for the lever and the cap to travel
  }
}

// the slider cap: a ridged thumb piece that rides on the switch lever and pokes out through the top edge (print flat on its back).
// The lever socket is at y = 0; the cap is about 2.9 + wall + 1.2 long. OFF is left, ON is right (print ON/OFF on the shell).
module power_slider() {
  cw = pw_lever_l + 2 * 1.4;                         // cap width along the slide
  difference() {
    union() {
      translate([-cw / 2, -0.4, 0]) cube([cw, pw_lever + 0.9, pw_t - 0.1]);                                  // around the lever, inside the shell
      translate([-cw / 2 + 0.4, pw_lever + 0.5, 0.4]) cube([cw - 0.8, wall + 1.6, pw_t - 0.9]);               // through the slot
      for (i = [-2 : 2]) translate([i * 1.3 - 0.35, pw_lever + 0.5 + wall + 1.6, 0.4]) cube([0.7, 0.9, pw_t - 0.9]);   // grip ridges
    }
    translate([-(pw_lever_l + 0.4) / 2, -0.5, (pw_t - 0.1 - (pw_lever_t + 0.3)) / 2]) cube([pw_lever_l + 0.4, pw_lever + 0.3, pw_lever_t + 0.3]);   // the lever fits in here
  }
}

// four ribs that locate the bought 2 x AA holder around the opening, and two bosses for the door screws
module battery_cradle() {
  translate([bat_cx, bat_cy, wall - 0.01]) difference() {
    translate([0, 0, bat_t / 2 + 0.01]) cube([bat_l + 2 * wall, bat_w + 2 * wall, bat_t + 0.02], center = true);
    translate([0, 0, bat_t / 2]) cube([bat_l + 0.6, bat_w + 0.6, bat_t + 1], center = true);
  }
  door_bosses() translate([0, 0, wall - 0.01]) cylinder(d = 6, h = 9);
}
module door_bosses() { for (s = [-1, 1]) translate([bat_cx + s * (bat_l / 2 + wall + 4.5), bat_cy, 0]) children(); }

// the battery door: a plate on the outside of the back with a lip that fills the opening; two screws
module battery_door() {
  difference() {
    union() {
      translate([0, 0, 0]) linear_extrude(1.6) offset(3) square([bat_l + 2 * wall + 2 * 9 - 6, bat_w - 6 + 2 * wall + 6], center = true);
      translate([0, 0, 1.5]) cube([open_l - 0.6, open_w - 0.6, 2.4], center = false);
    }
    for (s = [-1, 1]) translate([s * (bat_l / 2 + wall + 4.5), 0, -0.1]) cylinder(d = screw_d + 0.4, h = 2);
  }
}

// ---- the cartridge: a 1.0 mm PCB with 8 gold-finger pads and a SPI flash, in a printed shell ----
// Prints flat. The clipped corner stops it going in backwards. Slide the board in from the pad end and glue it.
module cartridge() {
  difference() {
    linear_extrude(cart_t) polygon([[-cart_w / 2, 0], [cart_w / 2, 0], [cart_w / 2, cart_len - 6], [cart_w / 2 - 6, cart_len], [-cart_w / 2 + 6, cart_len], [-cart_w / 2, cart_len - 6]]);
    translate([-(cart_w - 6) / 2, -0.1, (cart_t - 1.2) / 2]) cube([cart_w - 6, 24, 1.2]);                    // 1.0 mm board slot, opens at the pad end
    for (i = [0 : 4]) translate([-cart_w / 2 - 0.1, cart_len - 11 - i * 2.4, cart_t - 0.7]) cube([cart_w + 0.2, 1.1, 0.8]);   // thumb grip
    translate([-9, 6, cart_t - 0.4]) cube([18, 10, 0.5]);                                                     // label recess
  }
}

// ---- buttons ----
module dpad() { // a one-piece cross with a centre stem; arms slightly narrower than the openings
  union() {
    for (a = [0, 90]) rotate(a) translate([-dpad_arm, -3, 0]) cube([dpad_arm * 2, 6, 2.2]);
    translate([0, 0, 0]) cylinder(d = 8, h = 4.2);
  }
}
module round_button() { cylinder(d = btn_d, h = 1.8); translate([0, 0, 1.8]) cylinder(d = btn_d - 4, h = 2.6); }
module pill_button() { translate([-ss_w / 2, -ss_h / 2, 0]) cube([ss_w, ss_h, 1.6]); translate([-ss_w / 2 + 3, -ss_h / 2 + 1, 1.6]) cube([ss_w - 6, ss_h - 2, 2.4]); }

// ---- everything in place, for a picture ----
module assembly() {
  color("#f5c63c") front();
  color("#d6a41c") translate([0, 0, body_t]) mirror([0, 0, 1]) back();
  color("#2f3b66") translate([view_dx, view_dy, wall + 0.2]) cube([lcd_w, lcd_h, 1], center = true);
  color("#e0452f") translate([a_x, a_y, -0.2]) mirror([0, 0, 1]) round_button();
  color("#e0452f") translate([b_x, b_y, -0.2]) mirror([0, 0, 1]) round_button();
  color("#25304f") translate([dpad_x, dpad_y, -0.2]) mirror([0, 0, 1]) dpad();
}

part = "assembly";
if (part == "front") front();
else if (part == "back") back();
else if (part == "cartridge") cartridge();
else if (part == "door") battery_door();
else if (part == "slider") power_slider();
else if (part == "dpad") dpad();
else if (part == "button") round_button();
else if (part == "pill") pill_button();
else assembly();
