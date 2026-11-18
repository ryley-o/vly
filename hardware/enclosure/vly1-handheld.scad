// VLY-1 prototype handheld: a printable landscape shell for a Bambu A1 mini (180 x 180 x 180 mm bed).
// Parts print without supports, flat side down. Pick one with  -D 'part="front"'  (see the list at the bottom).
// Units are millimetres. Everything that depends on a part you buy is a named parameter, so change the number, not the shape.
//
//   openscad -o front.stl -D 'part="front"' vly1-handheld.scad     (or run  make -C hardware enclosure  for all parts)
//
// Prototype stack (docs/hardware-plan.md): 3.5" 480x320 module, a Pico 2 class board or the custom PCB, two AA cells in a
// holder reached through a door in the back, 28 mm speaker, eight 6x6x5 tact switches, a cartridge slot
// on the top edge. About 30 mm thick, because of the AA cells (a LiPo version would be 21 mm).

$fn = 48;

// ---- what you bought ----
lcd_w = 98.0;  lcd_h = 56.0;  lcd_t = 3.6;     // 3.5" module, outer glass+PCB footprint, thickness with FPC
view_w = 74.0; view_h = 49.5;                  // visible window of the panel (a little under the active area, so the edge hides)
view_dx = 0;   view_dy = 0;                    // shift the window if the panel's active area is off centre
bat_l = 58;    bat_w = 34;   bat_t = 16.0;     // two AA cells side by side in a holder: length, width, height (unverified: measure the holder you buy)
open_l = 54;   open_w = 31.5;                  // the opening in the back that the cells drop through (cells are 50.5 long, 14.5 across)
bat_cx = -20;  bat_cy = -21;                   // where the cells sit (centre), clear of the cartridge guide above
spk_d = 28.0;  spk_t = 4.2;                    // 28 mm round speaker
pcb_w = 134;   pcb_h = 70;   pcb_t = 1.6;      // main board, landscape
sw = 6.0;      sw_t = 5.0;                     // tact switch footprint and height (6x6x5)
cart_w = 30.0; cart_t = 4.0; cart_len = 36.0;  // the cartridge (see cartridge() below)
pw_x = -48;                                    // power slider: on the top edge, left of the cartridge, like the original Game Boy
pw_l = 9.0;   pw_w = 3.6;  pw_t = 3.6;         // the bought SPDT slide switch body (Adafruit 805 class; measure yours)
pw_travel = 4.0;                               // how far its lever moves between OFF and ON

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
    }
    post_xy() translate([0, 0, -0.1]) cylinder(d = screw_d + 0.4, h = bt + 0.2);                          // screws come in from the back
    post_xy() translate([0, 0, -0.1]) cylinder(d1 = 5.4, d2 = screw_d + 0.4, h = 2.5);                    // countersink
    for (i = [-3 : 3]) translate([41 + i * 3.4, -22, -0.1]) cube([1.6, 14, wall + 0.2]);                  // speaker grille
    translate([pw_x, body_h / 2 - wall - 0.5, wall + pw_t / 2 + 2]) cube([pw_travel + 7, wall * 3, 5], center = true);   // the power slider slot in the top edge
    translate([-(cart_w + 2 * tol) / 2, body_h / 2 - wall - 1, cz]) cube([cart_w + 2 * tol, wall * 3, ct]);   // the cartridge slot in the top edge
    translate([bat_cx, bat_cy, -0.1]) cube([open_l, open_w, wall * 3], center = true);                        // the battery opening
    door_bosses() translate([0, 0, wall]) cylinder(d = screw_d - 0.4, h = 9);                                // pilot holes for the door screws
  }
}

// a block under the top edge with a pocket for the bought slide switch; its lever points at the slot and the slider cap sits on it
module power_cradle() {
  translate([pw_x, body_h / 2 - wall - 3.6, wall - 0.01]) difference() {
    translate([0, 0, 4.5]) cube([pw_l + 6, 6, 9], center = true);
    translate([0, -0.6, 6.5]) cube([pw_l + 0.4, pw_w + 0.4, 9], center = true);   // the switch body (open at the top: it drops in from above)
    translate([0, 2.5, 6.5]) cube([pw_travel + 4, 4, 9], center = true);          // room for the lever to travel
  }
}

// the slider cap: a ridged thumb piece that rides on the switch lever and pokes out through the top edge. OFF is left, ON is right (print ON/OFF on the shell).
module power_slider() {
  difference() {
    union() {
      translate([-3.4, -0.5, 0]) cube([6.8, 3.0, 4.0]);                                    // inside the shell, around the lever
      translate([-3.0, 2.5, 0.4]) cube([6.0, wall + 1.2, 3.2]);                            // through the slot
      for (i = [-2 : 2]) translate([i * 1.1 - 0.35, 2.5 + wall + 1.2, 0.4]) cube([0.7, 0.9, 3.2]);  // grip ridges
    }
    translate([-1.1, -0.6, 0.8]) cube([2.2, 2.2, 2.4]);                                   // the lever fits in here
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
