<?php

namespace App\Console\Commands;

use Illuminate\Console\Command;
use App\Models\Product;
use App\Models\Category;
use App\Models\Brand;
use App\Models\Voucher;
use App\Models\News;

class ExportChatbotTraining extends Command
{
    protected $signature   = 'chatbot:export-training';
    protected $description = 'Xuất toàn bộ dữ liệu website thành file huấn luyện cho AI Chatbot';

    public function handle()
    {
        $this->info('Đang xuất dữ liệu huấn luyện...');
        $output = '';

        // =====================================================================
        // PHẦN 1: DANH MỤC SẢN PHẨM
        // =====================================================================
        $output .= "=============================================================\n";
        $output .= "PHẦN 1: DANH MỤC SẢN PHẨM\n";
        $output .= "=============================================================\n";

        $categories = Category::where('is_active', 1)->orderBy('name')->get();
        foreach ($categories as $cat) {
            $output .= "- Danh mục: {$cat->name}\n";
        }
        $output .= "\n";

        // =====================================================================
        // PHẦN 2: THƯƠNG HIỆU
        // =====================================================================
        $output .= "=============================================================\n";
        $output .= "PHẦN 2: THƯƠNG HIỆU\n";
        $output .= "=============================================================\n";

        $brands = Brand::where('is_active', 1)->orderBy('name')->get();
        foreach ($brands as $brand) {
            $output .= "- Thương hiệu: {$brand->name}\n";
        }
        $output .= "\n";

        // =====================================================================
        // PHẦN 3: DANH SÁCH TẤT CẢ SẢN PHẨM (Có thông số kỹ thuật)
        // =====================================================================
        $output .= "=============================================================\n";
        $output .= "PHẦN 3: TOÀN BỘ SẢN PHẨM VỚI THÔNG SỐ KỸ THUẬT\n";
        $output .= "=============================================================\n";
        $output .= "Lưu ý: Khi người dùng hỏi về sản phẩm, PHẢI kèm đường link sản phẩm theo chuẩn: /product/{slug}\n\n";

        $products = Product::with([
            'category',
            'brand',
            'variants',
            'specifications.specGroup',
        ])->where('is_active', 1)->orderBy('name')->get();

        $bar = $this->output->createProgressBar($products->count());
        $bar->start();

        foreach ($products as $product) {
            $price    = $product->sale_price > 0 ? $product->sale_price : $product->price;
            $priceStr = number_format($price, 0, ',', '.') . ' VND';
            $saleStr  = $product->sale_price > 0 ? ' (Giá gốc: ' . number_format($product->price, 0, ',', '.') . ' VND — Đang SALE!)' : '';

            $output .= "------------------------------------------------------------\n";
            $output .= "Tên sản phẩm: {$product->name}\n";
            $output .= "  - Thương hiệu: " . ($product->brand ? $product->brand->name : 'N/A') . "\n";
            $output .= "  - Danh mục: " . ($product->category ? $product->category->name : 'N/A') . "\n";
            $output .= "  - Giá bán: {$priceStr}{$saleStr}\n";
            $output .= "  - Link sản phẩm: /product/{$product->slug}\n";
            $output .= "  - SKU: {$product->sku}\n";
            $output .= "  - Tồn kho: {$product->quantity} chiếc\n";

            if ($product->description) {
                $desc = strip_tags($product->description);
                $desc = mb_substr($desc, 0, 300);
                $output .= "  - Mô tả: {$desc}...\n";
            }

            // Biến thể (màu sắc, dung lượng)
            if ($product->variants->count() > 0) {
                $variantStrs = $product->variants->map(function($v) {
                    $vPrice = $v->sale_price > 0 ? $v->sale_price : $v->price;
                    return "{$v->name} (" . number_format($vPrice, 0, ',', '.') . " VND)";
                })->join(', ');
                $output .= "  - Phiên bản / Biến thể: {$variantStrs}\n";
            }

            // Thông số kỹ thuật
            if ($product->specifications->count() > 0) {
                $output .= "  - Thông số kỹ thuật:\n";
                $groups = $product->specifications->groupBy(fn($s) => $s->specGroup ? $s->specGroup->name : 'Khác');
                foreach ($groups as $groupName => $specs) {
                    $output .= "      [{$groupName}]\n";
                    foreach ($specs as $spec) {
                        $output .= "        * {$spec->name}: {$spec->value}\n";
                    }
                }
            }

            $output .= "\n";
            $bar->advance();
        }
        $bar->finish();
        $this->newLine();

        // =====================================================================
        // PHẦN 4: MÃ GIẢM GIÁ / VOUCHER
        // =====================================================================
        $output .= "=============================================================\n";
        $output .= "PHẦN 4: MÃ GIẢM GIÁ (VOUCHER)\n";
        $output .= "=============================================================\n";

        $vouchers = Voucher::where('is_active', 1)
            ->where(function ($q) {
                $q->whereNull('end_date')->orWhere('end_date', '>=', now());
            })->get();

        if ($vouchers->count() > 0) {
            foreach ($vouchers as $v) {
                $val = $v->discount_type == 'percent'
                    ? "{$v->discount_value}%"
                    : number_format($v->discount_value, 0, ',', '.') . ' VND';

                $minOrder = $v->min_order_amount > 0
                    ? ' (Đơn tối thiểu: ' . number_format($v->min_order_amount, 0, ',', '.') . ' VND)'
                    : '';

                $maxDiscount = $v->max_discount > 0
                    ? ', giảm tối đa ' . number_format($v->max_discount, 0, ',', '.') . ' VND'
                    : '';

                $expires = $v->end_date ? ' — Hết hạn: ' . $v->end_date->format('d/m/Y') : ' — Không giới hạn thời gian';

                $output .= "- Mã '{$v->code}': {$v->name} — Giảm {$val}{$maxDiscount}{$minOrder}{$expires}\n";
            }
        } else {
            $output .= "Hiện tại không có mã giảm giá nào đang hoạt động.\n";
        }
        $output .= "\n";

        // =====================================================================
        // PHẦN 5: TIN TỨC / CHÍNH SÁCH
        // =====================================================================
        $output .= "=============================================================\n";
        $output .= "PHẦN 5: TIN TỨC VÀ CHÍNH SÁCH\n";
        $output .= "=============================================================\n";
        $output .= "Lưu ý: Khi hỏi về chính sách, đường link bài viết là: /news/{slug}\n\n";

        $news = News::where('is_active', 1)
            ->where(function ($q) {
                $q->whereNull('published_at')->orWhere('published_at', '<=', now());
            })->orderByDesc('published_at')->get();

        foreach ($news as $n) {
            $output .= "- Tiêu đề: {$n->title}\n";
            $output .= "  Link: /news/{$n->slug}\n";
            if ($n->summary) {
                $output .= "  Tóm tắt: {$n->summary}\n";
            }
        }
        $output .= "\n";

        // =====================================================================
        // PHẦN 6: HƯỚNG DẪN SO SÁNH SẢN PHẨM
        // =====================================================================
        $output .= "=============================================================\n";
        $output .= "PHẦN 6: SO SÁNH SẢN PHẨM\n";
        $output .= "=============================================================\n";
        $output .= "Website SpaceLink có tính năng so sánh sản phẩm tại đường dẫn: /compare\n";
        $output .= "Khi khách hàng muốn so sánh 2 sản phẩm bất kỳ, hãy:\n";
        $output .= "1. Cung cấp bảng so sánh thông số kỹ thuật dựa trên dữ liệu ở Phần 3.\n";
        $output .= "2. Nêu điểm mạnh và điểm yếu của từng máy.\n";
        $output .= "3. Gợi ý sản phẩm phù hợp với nhu cầu cụ thể của khách (gaming, chụp ảnh, làm việc...).\n";
        $output .= "4. Kèm đường link tới /compare để khách tự tay so sánh trực tiếp trên web.\n";
        $output .= "\n";

        // Lưu file
        $path = storage_path('app/chatbot_training.txt');
        file_put_contents($path, $output);

        $sizeKb = round(filesize($path) / 1024, 1);
        $this->info("\n✅ Xuất thành công! File được lưu tại: storage/app/chatbot_training.txt ({$sizeKb} KB)");
        $this->info("📌 Bước tiếp theo: Đăng nhập dashboard FastBots → Chọn bot → Knowledge Base → Upload file này.");

        return 0;
    }
}
