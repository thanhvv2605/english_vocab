# IELTS Vocab

Ứng dụng web **miễn phí, mã nguồn mở** giúp học thuộc từ vựng IELTS bằng phương pháp lặp lại ngắt quãng. Ứng dụng chạy ngay trên máy của bạn, không cần tài khoản, không cần mạng, không thu thập dữ liệu. Giao diện có tiếng Việt và tiếng Anh.

> Dự án được chia sẻ để mọi người cùng học. Nếu thấy hữu ích, hãy cho repo một ⭐ và góp thêm từ vựng hoặc báo lỗi nhé.

## Tính năng

- **719 từ IELTS soạn sẵn** trong 17 nhóm: từ vựng học thuật, biểu đồ & xu hướng (Writing Task 1), môi trường, giáo dục, công nghệ, sức khoẻ, công việc, kinh tế, xã hội, tội phạm & pháp luật, chính phủ, truyền thông, khoa học, đô thị & giao thông, du lịch, gia đình, cùng một **sổ tay mẫu** (xem [Bộ từ vựng](#bộ-từ-vựng)).
- Mỗi từ có **phiên âm IPA (Anh – Anh)**, từ loại, trình độ CEFR (B1–C2), nghĩa tiếng Việt, định nghĩa tiếng Anh, **câu ví dụ phong cách IELTS** kèm bản dịch, cụm từ thường gặp và từ đồng nghĩa.
- **Lặp lại ngắt quãng bằng FSRS**, thuật toán hiện đại mà Anki cũng dùng. Ứng dụng dự đoán lúc bạn sắp quên từng từ để nhắc ôn đúng lúc.
- **Học từ mới theo nhóm 5 từ**: xem và nghe từng từ, rồi tự kiểm tra hai bước (chọn nghĩa, sau đó tự gõ lại từ). Từ nào sai sẽ được hỏi lại ngay trong buổi học.
- **Luyện tập** với 5 dạng câu hỏi: Anh → Việt, Việt → Anh, chính tả, nghe và gõ lại, điền từ vào câu. Luyện tập không làm thay đổi lịch ôn.
- **Kho từ**: tìm kiếm có dấu hoặc không dấu, lọc theo chủ đề / trạng thái / dấu sao, ghi mẹo nhớ, thêm từ của riêng bạn hoặc nhập cả danh sách.
- Phát âm bằng giọng đọc có sẵn của máy (Anh – Anh hoặc Anh – Mỹ), chế độ sáng / tối, dùng được trên điện thoại và máy tính, có phím tắt.

## Cài đặt và chạy

Cần cài **[Node.js](https://nodejs.org) 20 trở lên** (chọn bản LTS).

### 1. Tải mã nguồn

```bash
git clone https://github.com/thanhvv2605/english_vocab.git
cd english_vocab
```

Nếu không dùng Git, bấm **Code → Download ZIP** trên GitHub rồi giải nén.

### 2. Chạy ứng dụng

**macOS:** nhấp đúp vào file `Mo IELTS Vocab.command`. Lần đầu sẽ mất khoảng một phút để cài đặt, sau đó trình duyệt tự mở http://localhost:5199. Giữ cửa sổ Terminal mở trong lúc học.

> Nếu macOS báo không mở được file vì “không xác định được nhà phát triển”, hãy **nhấp chuột phải → Open**. Nếu bạn tải bản ZIP và file không chạy, mở Terminal trong thư mục dự án và chạy `chmod +x "Mo IELTS Vocab.command"`.

**Windows, Linux hoặc dùng Terminal:**

```bash
npm install     # chỉ cần chạy lần đầu
npm start       # build và mở http://localhost:5199
```

Muốn dừng ứng dụng thì nhấn `Ctrl + C` trong Terminal.

## Cách học hiệu quả

1. **Mỗi ngày mở trang “Hôm nay”.** Làm phần **Ôn tập** trước, sau đó mới **Học từ mới**. Ôn đúng hạn quan trọng hơn học nhiều từ mới.
2. Khi ôn, hãy cố nhớ ra nghĩa *trước khi* lật thẻ, rồi tự đánh giá thật lòng:
   - **Quên**: không nhớ ra, từ sẽ quay lại sau ít phút.
   - **Khó**: nhớ ra nhưng rất chật vật.
   - **Nhớ**: nhớ ra sau một chút suy nghĩ (lựa chọn thường dùng nhất).
   - **Dễ**: nhớ ngay lập tức.
3. Bắt đầu với **10 từ mới mỗi ngày**. Sau khoảng 2–3 tuần, số từ cần ôn mỗi ngày sẽ ổn định ở mức khoảng 5–8 lần số từ mới.
4. Mỗi tuần một lần, dùng **Luyện tập → Từ hay quên** để củng cố những từ khó.
5. Ghi **mẹo nhớ** của riêng bạn vào phần ghi chú của từng từ (trong Kho từ).

### Phím tắt

| Phím | Tác dụng |
| --- | --- |
| `Space` / `Enter` | Lật thẻ / tiếp tục |
| `1` `2` `3` `4` | Đánh giá Quên / Khó / Nhớ / Dễ, hoặc chọn đáp án trắc nghiệm |
| `P` | Nghe phát âm |
| `Z` | Hoàn tác lần đánh giá vừa rồi |
| `K` | “Tôi biết từ này rồi” (khi học từ mới) |

## Dữ liệu và quyền riêng tư

- Toàn bộ tiến độ được lưu trong trình duyệt của máy bạn (IndexedDB). Ứng dụng **không có máy chủ, không gửi dữ liệu đi đâu cả**.
- Dữ liệu gắn với địa chỉ **http://localhost:5199**. Hãy luôn dùng đúng địa chỉ này và cùng một trình duyệt, nếu không bạn sẽ thấy như bị mất tiến độ.
- Vào **Cài đặt → Xuất bản sao lưu** định kỳ, nhất là trước khi xoá dữ liệu trình duyệt, đổi trình duyệt hoặc đổi máy. Dùng **Khôi phục từ bản sao lưu** để lấy lại dữ liệu.

## Bộ từ vựng

Từ vựng gốc nằm trong `data/topics/`, mỗi chủ đề là một file JSON theo định dạng mô tả trong [`data/SCHEMA.md`](data/SCHEMA.md).

- `notebook.json` (**Sổ tay của tôi**, 75 từ) là sổ tay mẫu của tác giả. Nhóm này luôn được học trước tiên. Bạn có thể giữ nguyên, thay bằng từ của mình, hoặc để file thành `[]` nếu chỉ muốn học theo chủ đề.
- Các file còn lại là 16 chủ đề IELTS phổ biến, mỗi chủ đề khoảng 40 từ.

Sau khi sửa dữ liệu, chạy `npm run data` (lệnh `npm start` cũng tự chạy bước này). Lần mở ứng dụng tiếp theo, từ mới sẽ được đồng bộ vào, còn tiến độ, dấu sao và ghi chú đã có vẫn được giữ nguyên.

> Nội dung được soạn và kiểm tra cẩn thận nhưng vẫn có thể còn sai sót. Nếu thấy phiên âm, nghĩa hay câu ví dụ chưa đúng, hãy [mở issue](../../issues) hoặc gửi pull request.

## Đóng góp

Mọi đóng góp đều được hoan nghênh: thêm từ, sửa nghĩa, dịch giao diện, sửa lỗi hay cải thiện tính năng.

1. Fork repo và tạo nhánh mới.
2. Thực hiện thay đổi:
   - **Thêm hoặc sửa từ:** sửa file trong `data/topics/` theo đúng `data/SCHEMA.md`. Chạy `npm run data` để kiểm tra; script sẽ báo lỗi nếu thiếu trường, sai từ loại, sai trình độ hoặc `exampleForm` không có trong câu ví dụ.
   - **Giao diện:** `src/i18n/en.ts` là bản chuẩn; mọi khoá mới phải có bản dịch trong `vi.ts`.
3. Chạy `npm test` (và `npm run test:e2e` nếu bạn sửa giao diện) trước khi gửi pull request.

### Lệnh dành cho lập trình viên

| Lệnh | Mô tả |
| --- | --- |
| `npm run dev` | Chạy chế độ phát triển (cổng 5199, tự tải lại) |
| `npm start` | Build bản production và chạy ở cổng 5199 |
| `npm test` | Unit test (Vitest): FSRS, sinh câu hỏi, cơ sở dữ liệu, sao lưu, dữ liệu từ vựng, i18n |
| `npm run test:e2e` | Test end-to-end (Playwright) trên bản build thật, chạy ở cổng 4317 riêng nên không đụng tới dữ liệu học |
| `npm run typecheck` | Kiểm tra kiểu TypeScript |
| `npm run data` | Kiểm tra và gộp `data/topics/*.json` thành `src/data/words.json` |

Lần đầu chạy test e2e cần cài trình duyệt cho Playwright: `npx playwright install chromium`.

**Công nghệ:** React 19, TypeScript, Vite, Tailwind CSS 4, Dexie (IndexedDB), [ts-fsrs](https://github.com/open-spaced-repetition/ts-fsrs). Font Be Vietnam Pro và Bricolage Grotesque được đóng gói sẵn nên ứng dụng chạy được khi không có mạng.

### Cấu trúc thư mục

```
data/topics/        Từ vựng gốc theo chủ đề (JSON, xem data/SCHEMA.md)
scripts/            build-data.mjs: kiểm tra và gộp dữ liệu
src/db/             Cơ sở dữ liệu, thao tác học/ôn, thống kê, sao lưu
src/lib/            FSRS, sinh câu hỏi, xử lý văn bản, phát âm
src/i18n/           Bản dịch giao diện (en.ts là chuẩn, vi.ts bắt buộc đủ khoá)
src/pages/          Hôm nay, Học từ mới, Ôn tập, Luyện tập, Kho từ, Cài đặt
e2e/                Test Playwright
```

## Giấy phép

- **Mã nguồn:** [MIT](LICENSE).
- **Dữ liệu từ vựng** (`data/topics/`, `src/data/words.json`): [CC BY 4.0](data/LICENSE). Bạn được tự do dùng lại, chỉnh sửa và chia sẻ, kể cả cho mục đích thương mại, miễn là ghi nguồn dẫn về dự án này.

## Ghi nhận

- [FSRS](https://github.com/open-spaced-repetition/fsrs4anki) và [ts-fsrs](https://github.com/open-spaced-repetition/ts-fsrs) của nhóm Open Spaced Repetition.
- Font [Be Vietnam Pro](https://fonts.google.com/specimen/Be+Vietnam+Pro) và [Bricolage Grotesque](https://fonts.google.com/specimen/Bricolage+Grotesque) (SIL Open Font License).

IELTS là thương hiệu đã đăng ký của British Council, IDP: IELTS Australia và Cambridge University Press & Assessment. Dự án này không liên kết với hay được bảo trợ bởi các tổ chức trên.
