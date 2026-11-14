@echo off
chcp 65001 >nul
REM Mo cong 5173 tren Windows Firewall de dien thoai (bat hotspot / cung Wi-Fi) vao duoc web order.
REM Chay 1 lan duy nhat. Can quyen Administrator -> script tu hoi.
net session >nul 2>&1
if %errorlevel% neq 0 (
  echo Dang xin quyen Administrator...
  powershell -Command "Start-Process '%~f0' -Verb RunAs"
  exit /b
)
netsh advfirewall firewall delete rule name="Cafe QR Order - Vite 5173" >nul 2>&1
netsh advfirewall firewall add rule name="Cafe QR Order - Vite 5173" dir=in action=allow protocol=TCP localport=5173 profile=any
echo.
echo Da mo cong 5173 cho moi loai mang (Private + Public). Gio dien thoai quet QR la vao duoc.
echo.
pause
