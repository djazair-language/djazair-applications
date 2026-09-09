# Djazair Raylib Extension Manual

The **Raylib** extension provides 2D game development and interactive media capabilities for the Djazair programming language. It wraps the popular **Raylib 5.5** library with a clean object-oriented interface.

---

## Table of Contents
1. [Installation](#1-installation)
2. [Quick Start](#2-quick-start)
3. [Window Class](#3-window-class)
4. [Drawing 2D Shapes](#4-drawing-2d-shapes)
5. [Input Handling](#5-input-handling)
6. [Camera2D](#6-camera2d)
7. [Textures and Sprites](#7-textures-and-sprites)
8. [Text and Fonts](#8-text-and-fonts)
9. [Audio](#9-audio)
10. [Vector2 and Color](#10-vector2-and-color)
11. [Constants](#11-constants)
12. [Complete Examples](#12-complete-examples)

---

## 1. Installation

Make sure Raylib is installed on your system (e.g., via MSYS2: `pacman -S mingw-w64-x86_64-raylib`), then build the extension:

```bash
cd extensions/raylib
.\build.bat <path\to\djazair-language>
```

Then import it in your script:

```djazair
use raylib as rl
```

---

## 2. Quick Start

```dz
use raylib as rl

let win = rl.Window(800, 600, "Hello Djazair!")
win.setFPS(60)

while win.isOpen()
    win.begin()
    win.clear(rl.RAYWHITE)
    rl.drawText("Hello from Djazair!", 200, 200, 30, rl.BLUE)
    win.finish()
end

win.close()
```

---

## 3. Window Class

Manages the application window, drawing state, and frame timing.

### `init(w, h, title)`
Opens a new window with given width, height, and title.

```dz
let win = rl.Window(1024, 768, "My Game")
```

### `isOpen()` → Bool
Returns `True` while the window should remain open.

```dz
while win.isOpen()
    # game loop
end
```

### `begin()` / `finish()`
Start and end the drawing state for each frame. All drawing calls must go between these.

```dz
win.begin()
# draw stuff here
win.finish()
```

### `clear(color)`
Fills the screen background with a color.

```dz
win.clear(rl.BLACK)
```

### `setFPS(fps)`
Limits the frame rate.

```dz
win.setFPS(60)
```

### `getFPS()` → Int
Returns the current frames per second.

```dz
print("FPS: " + str(win.getFPS()))
```

### `setTitle(title)`
Changes the window title dynamically.

```dz
win.setTitle("Score: 100")
```

### `setSize(w, h)`
Resizes the window.

```dz
win.setSize(1280, 720)
```

### `close()`
Closes the window and frees resources.

```dz
win.close()
```

---

## 4. Drawing 2D Shapes

### Standalone Functions

```dz
rl.drawRectangle(x, y, w, h, color)
rl.drawRectangleLines(x, y, w, h, color)
rl.drawRectangleGradientV(x, y, w, h, color1, color2)
rl.drawRectangleRounded(x, y, w, h, roundness, segments, color)
rl.drawCircle(x, y, radius, color)
rl.drawCircleLines(x, y, radius, color)
rl.drawEllipse(centerX, centerY, radiusH, radiusV, color)
rl.drawLine(x1, y1, x2, y2, color)
rl.drawLineEx(x1, y1, x2, y2, thickness, color)
rl.drawTriangle(v1x, v1y, v2x, v2y, v3x, v3y, color)
rl.drawTriangleLines(v1x, v1y, v2x, v2y, v3x, v3y, color)
rl.drawPoly(x, y, sides, radius, rotation, color)
```

```dz
rl.drawCircle(400, 300, 50, rl.RED)
rl.drawRectangle(100, 100, 200, 150, rl.GREEN)
```

### Shape Objects

The `Circle` and `Rectangle` classes provide an OOP interface with collision checking.

```dz
let ball = rl.Circle(400, 300, 30, rl.PURPLE)
ball.draw()

let box = rl.Rectangle(100, 100, 200, 150, rl.LIME)
box.drawLines()
box.drawGradientV(rl.BLUE)

if ball.checkCollision(box)
    print("Collision!")
end
```

---

## 5. Input Handling

### Keyboard

```dz
# Continuous check
if rl.isKeyDown(rl.KEY_LEFT) x = x - 5 end

# Single press
if rl.isKeyPressed(rl.KEY_SPACE)
    print("Jump!")
end

# Key release
if rl.isKeyReleased(rl.KEY_ENTER) end

# Key up
if rl.isKeyUp(rl.KEY_SHIFT) end

# Last key pressed (returns key code)
let k = rl.getKeyPressed()
# Last character typed (unicode)
let c = rl.getCharPressed()
```

### Mouse

```dz
if rl.isMouseButtonPressed(rl.MOUSE_LEFT_BUTTON)
    print("Clicked at " + str(rl.getMouseX()) + ", " + str(rl.getMouseY()))
end

let mx = rl.getMouseX()
let my = rl.getMouseY()

if rl.isMouseButtonDown(rl.MOUSE_RIGHT_BUTTON) end
if rl.isMouseButtonReleased(rl.MOUSE_MIDDLE_BUTTON) end
if rl.isMouseButtonUp(rl.MOUSE_LEFT_BUTTON) end

let wheel = rl.getMouseWheelMove()
```

---

## 6. Camera2D

The `Camera2D` class enables a scrolling 2D viewport independent of screen coordinates.

### `init()`
Creates a camera with default properties.

```dz
let camera = rl.Camera2D()
camera.offset_x = 400.0   # screen anchor
camera.offset_y = 300.0
camera.target_x = 0.0     # world target
camera.target_y = 0.0
camera.zoom = 1.0
camera.rotation = 0.0
```

### `begin()` / `finish()`
Wrap world-space drawing between camera begin/finish. Everything outside is in screen space (HUD).

```dz
camera.begin()
# Draw world objects here
camera.finish()
# Draw HUD here
```

### `toWorld(screenX, screenY)` → `[x, y]`
Converts screen coordinates (e.g., mouse) to world space.

```dz
let world = camera.toWorld(rl.getMouseX(), rl.getMouseY())
print("World: " + str(world[0]) + ", " + str(world[1]))
```

### `toScreen(worldX, worldY)` → `[x, y]`
Converts world coordinates to screen space.

```dz
let screen = camera.toScreen(100.0, 200.0)
```

---

## 7. Textures and Sprites

### Texture
Loads and draws images.

```dz
let tex = rl.Texture("sprite.png")
tex.draw(100, 100)                        # full image
tex.drawRec(0, 0, 32, 32, 200, 200, rl.WHITE)  # sprite sheet crop
tex.drawEx(300, 300, 45.0, 2.0, rl.WHITE)       # rotated + scaled
tex.unload()
```

---

## 8. Text and Fonts

### Text (default font)

```dz
let msg = rl.Text("Hello", 20, rl.WHITE)
msg.draw(10, 10)

# Or use standalone
rl.drawText("Hello", 10, 10, 20, rl.WHITE)
```

### Font (custom TTF)

```dz
let font = rl.Font("arial.ttf")
font.draw("Custom font!", 100, 100, 32, 1.0, rl.WHITE)
font.unload()
```

### Text Measurement

```dz
let w = rl.measureText("Hello", 20)
```

---

## 9. Audio

### Audio Device

```dz
let audio = rl.Audio()
# ... play sounds ...
audio.close()
```

### Sound (short effects)

```dz
let sfx = rl.Sound("click.wav")
sfx.play()
sfx.unload()
```

### Music (streamed)

```dz
let bgm = rl.Music("theme.ogg")
bgm.play()

# In game loop:
bgm.update()

bgm.pause()
bgm.resume()
bgm.stop()

if bgm.isPlaying()
    print("Music playing")
end

bgm.setVolume(0.5)
bgm.unload()
```

---

## 10. Vector2 and Color

### Vector2

```dz
let v1 = rl.Vector2(10, 20)
let v2 = rl.Vector2(5, 5)
let sum = v1.add(v2)        # (15, 25)
let diff = v1.sub(v2)       # (5, 15)
let scaled = v1.scale(2.0)  # (20, 40)
```

### Color

```dz
let c = rl.Color(255, 128, 0, 255)
c.raw  # [255, 128, 0, 255] — for native calls
```

---

## 11. Constants

**Colors:** `rl.WHITE`, `rl.BLACK`, `rl.RED`, `rl.GREEN`, `rl.BLUE`, `rl.YELLOW`, `rl.ORANGE`, `rl.PINK`, `rl.PURPLE`, `rl.GOLD`, `rl.LIME`, `rl.DARKGRAY`, `rl.GRAY`, `rl.LIGHTGRAY`, `rl.MAROON`, `rl.DARKGREEN`, `rl.DARKBLUE`, `rl.DARKPURPLE`, `rl.VIOLET`, `rl.BEIGE`, `rl.BROWN`, `rl.MAGENTA`, `rl.SKYBLUE`, `rl.RAYWHITE`, `rl.BLANK`.

**Keyboard Keys:** `rl.KEY_LEFT`, `rl.KEY_RIGHT`, `rl.KEY_UP`, `rl.KEY_DOWN`, `rl.KEY_A`–`rl.KEY_Z`, `rl.KEY_0`–`rl.KEY_9`, `rl.KEY_F1`–`rl.KEY_F12`, `rl.KEY_SPACE`, `rl.KEY_ENTER`, `rl.KEY_ESCAPE`, `rl.KEY_BACKSPACE`, `rl.KEY_TAB`, `rl.KEY_LEFT_SHIFT`, `rl.KEY_LEFT_CONTROL`, `rl.KEY_LEFT_ALT`, `rl.KEY_DELETE`, `rl.KEY_INSERT`, `rl.KEY_HOME`, `rl.KEY_END`, `rl.KEY_PAGE_UP`, `rl.KEY_PAGE_DOWN`.

**Mouse Buttons:** `rl.MOUSE_LEFT_BUTTON`, `rl.MOUSE_RIGHT_BUTTON`, `rl.MOUSE_MIDDLE_BUTTON`.

---

## 12. Complete Examples

### 12.1 Basic Window

```dz
use raylib as rl

let win = rl.Window(800, 600, "Basic Window")
win.setFPS(60)

while win.isOpen()
    win.begin()
    win.clear(rl.RAYWHITE)
    rl.drawText("Hello from Djazair!", 200, 200, 30, rl.BLUE)
    rl.drawText("FPS: " + str(win.getFPS()), 10, 10, 16, rl.DARKGRAY)
    win.finish()
end

win.close()
```

### 12.2 Shapes

```dz
use raylib as rl

let win = rl.Window(800, 600, "Shapes")
win.setFPS(60)

while win.isOpen()
    win.begin()
    win.clear(rl.BLACK)

    rl.drawRectangle(50, 50, 150, 100, rl.RED)
    rl.drawCircle(400, 100, 60, rl.YELLOW)
    rl.drawEllipse(400, 300, 80, 40, rl.PURPLE)
    rl.drawLine(600, 50, 750, 150, rl.SKYBLUE)
    rl.drawTriangle(600, 350, 700, 500, 550, 450, rl.LIME)
    rl.drawPoly(700, 150, 6, 50, 0.0, rl.MAGENTA)

    win.finish()
end

win.close()
```

### 12.3 Input and Movement

```dz
use raylib as rl

let win = rl.Window(800, 600, "Input Demo")
win.setFPS(60)

let x = 400.0
let y = 300.0

while win.isOpen()
    if rl.isKeyDown(rl.KEY_LEFT) x = x - 4 end
    if rl.isKeyDown(rl.KEY_RIGHT) x = x + 4 end
    if rl.isKeyDown(rl.KEY_UP) y = y - 4 end
    if rl.isKeyDown(rl.KEY_DOWN) y = y + 4 end

    if rl.isKeyPressed(rl.KEY_ESCAPE) win.close() end

    win.begin()
    win.clear(rl.RAYWHITE)
    rl.drawCircle(x, y, 30, rl.RED)
    rl.drawText("Arrow keys to move, ESC to quit", 200, 500, 16, rl.DARKGRAY)
    win.finish()
end
```

All examples are available in the `examples/` directory.
