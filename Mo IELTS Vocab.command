#!/bin/bash
# Nhấp đúp để chạy IELTS Vocab. Giữ cửa sổ Terminal này mở trong lúc học.
cd "$(dirname "$0")" || exit 1
if ! command -v npm >/dev/null 2>&1; then
  echo "Chưa cài Node.js. Tải tại https://nodejs.org (bản LTS) rồi chạy lại."
  read -r -p "Nhấn Enter để đóng..."
  exit 1
fi
if [ ! -d node_modules ]; then
  echo "Lần đầu chạy: đang cài đặt thư viện..."
  npm install || { read -r -p "Cài đặt lỗi. Nhấn Enter để đóng..."; exit 1; }
fi
npm start
