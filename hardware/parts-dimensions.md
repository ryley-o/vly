# Real dimensions of the stage 1 parts

Millimetres. Every number is from a supplier's page or a manufacturer's datasheet or drawing (linked), except the rows marked **measure**: the
supplier does not publish them, so they are guesses in `enclosure/vly1-handheld.scad` until someone puts calipers on the real part. When a part
arrives, measure it, change the named parameter at the top of the scad file, and move the row from "measure" to "verified".

| Part | Dimensions | Source | In the scad as |
|---|---|---|---|
| 3.5" panel (the glass), 320 x 480 | outline **84.07 x 54.34** (+-0.2), **3.3** thick (+-0.2); active area **73.44 x 48.96**; touch panel viewing area 75.09 x 49.96, outline 82.34 x 50.66; FPC tail below the glass | [panel drawing](http://www.adafruit.com/datasheets/Adafruit35inTFT.pdf) | `lcd_w`, `lcd_h`, `lcd_t`, `view_w`, `view_h` |
| Adafruit 3.5" TFT breakout (ID 2050) | PCB **56 x 97 x 2**, 52 g, 20-pin 0.1" header; four corner mounting holes on ears (about 2.4 x 3.6 in apart, 2.6 in across the ears, from the [fab print](https://learn.adafruit.com/adafruit-3-5-color-320x480-tft-touchscreen-breakout/downloads)); **measure** the thickness of the whole stack with header and microSD socket | [product page](https://www.adafruit.com/product/2050), [learn guide](https://learn.adafruit.com/adafruit-3-5-color-320x480-tft-touchscreen-breakout/downloads) | `lcd_*` (the glass only) |
| Raspberry Pi Pico 2 | **51 x 21 x 1**, four 2.1 mm mounting holes, 0.1" pins, micro-USB overhangs the short edge | [datasheet, chapter 3](https://datasheets.raspberrypi.com/pico/pico-2-datasheet.pdf) | `pcb_w`, `pcb_h` (the future custom board) |
| 2 x AA holder with switch (ID 4193) | **68.2 x 34.4 x 18.8** (the page does not say which is which; length > width > height assumed), JST-PH lead about 150 mm | [product page](https://www.adafruit.com/product/4193) | `bat_l`, `bat_w`, `bat_t` |
| Thin plastic speaker, 8 ohm 0.25 W (ID 1891) | diameter **40** (the page says 39), 11 g, 0.25 W rated (0.4 W for a minute); **measure** the thickness (not published, 5.0 assumed) | [datasheet](https://cdn-shop.adafruit.com/datasheets/1891_datasheet_2.pdf) | `spk_d`, `spk_t` |
| Breadboard-friendly slide switch SS-12E17 (ID 805) | body **11.6 long x 6.0 deep x 4.1 wide**; lever **4.6 x 2.1**, travel **2.5**; three pins on a 2.5 pitch (1.0 holes); **measure** how far the lever stands above the body (the drawing's X; 2.5 assumed) | [datasheet, drawing on page 6](https://cdn-shop.adafruit.com/product-files/805/SS-12E17G2-revised.pdf) | `pw_l`, `pw_w`, `pw_t`, `pw_lever`, `pw_lever_l`, `pw_lever_t`, `pw_travel` |
| Tact switch, 6 mm slim (ID 1489) | body **6.0 x 3.5**, **4.3** tall to the top of the button (3.6 to the body top), pins 3.5 long, 6.8 and 8.0 across the pins, travel 0.25, 1.7 x 3.1 button | [datasheet drawing](https://cdn-shop.adafruit.com/product-files/1489/C1779-001+datasheet.pdf) | `sw`, `sw_w`, `sw_t` |
| PAM8302 amplifier breakout (ID 2130) | **15 x 24 x 2** without the header, 1.4 g; mounting holes **measure** | [product page](https://www.adafruit.com/product/2130) | not modelled |
| Pololu 3.3 V boost U1V10F3 (2563) | **8.9 x 11.4 x 2.5** (0.35 x 0.45 x 0.10 in) without headers, 0.4 g | [product page](https://www.pololu.com/product/2563) | not modelled |
| AA cell | 14.5 diameter x 50.5 long | the standard (IEC R6) | `open_l`, `open_w` |

## What changed in the shell because of the real numbers

- The speaker is **40 mm, not 28** (the first design assumed a 28 mm speaker): it now sits in a ring bottom right (`spk_x`, `spk_y`).
- The battery holder is **68.2 x 34.4 x 18.8, not 58 x 34 x 16**: the shell is about 3 mm thicker (about 33 mm).
- The panel recess is the glass, **84.07 x 54.34 x 3.3**; the window is between the active area and the touch viewing area.
- The tact switches are 6.0 x 3.5 x 4.3, not 6 x 6 x 5: the shell's button stack gets shorter.
- The power slider's switch pocket and cap use the real SS-12E17 body and lever.

## Day-one measuring list (calipers)

1. Speaker thickness. 2. Slide switch: lever height above the body, and the width of the lever. 3. The breakout: total thickness at the header and the microSD socket,
and where the panel's active area sits on the glass (the drawing shows it off centre by about 2.4 mm along the long side; confirm which way round it is). 4. The holder: which of the three
numbers is which, and the opening the cells drop through. 5. Mounting hole positions on the breakout, the amplifier and the boost converter.
