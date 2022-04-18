import board
import neopixel
from time import sleep
import sys

lightVal = int(sys.argv[1])
jas = float(sys.argv[2])
r = int(sys.argv[3])
g = int(sys.argv[4])
b = int(sys.argv[5])

pixels = neopixel.NeoPixel(board.D12, 28, brightness = jas)

if(lightVal == 1):
    pixels.fill((r, g, b))
elif(lightVal == 0):
    pixels.fill((0, 0, 0))

sys.stdout.flush()