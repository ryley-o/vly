# pal

A VLY-1 cartridge.

```sh
vly build                                   # compile src/main.vly -> build/pal.vlc
vly run build/pal.vlc --frames 60 --input "RIGHT@0-59" --screenshot shot.png
vly test                                    # run the tests in vly.json
vly docs                                    # list the documentation
```

Edit `src/main.vly` and `assets/hero.tiles`. See AGENTS.md in the vly repository for the recommended workflow.
