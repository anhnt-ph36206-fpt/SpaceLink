<?php

namespace App\Http\Controllers\Api\Client;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;

class ChatbotController extends Controller
{
    public function chat(Request $request)
    {
        $request->validate([
            'messages' => 'required|array',
            'messages.*.role' => 'required|string|in:user,model',
            'messages.*.parts' => 'required|array',
            'messages.*.parts.*.text' => 'required|string',
        ]);

        $apiKey = env('GEMINI_API_KEY');
        if (!$apiKey) {
            return response()->json(['error' => 'Gemini API key is missing.'], 500);
        }

        $endpoint = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=' . $apiKey;

        // 1. DỮ LIỆU TĨNH (GLOBAL)
        $globalContext = "";
        try {
            // Lấy danh mục
            $categories = \App\Models\Category::where('is_active', 1)->pluck('name')->toArray();
            $categoryStr = !empty($categories) ? implode(", ", $categories) : "Không có";

            // Lấy thương hiệu
            $brands = \App\Models\Brand::where('is_active', 1)->pluck('name')->toArray();
            $brandStr = !empty($brands) ? implode(", ", $brands) : "Không có";

            // Lấy Voucher (Tối đa 10)
            $vouchers = \App\Models\Voucher::where('is_active', 1)
                ->where(function($q) {
                    $q->whereNull('end_date')->orWhere('end_date', '>=', now());
                })
                ->take(10)->get(['code', 'name', 'discount_value', 'discount_type']);
            $voucherStr = "";
            if ($vouchers->count() > 0) {
                foreach($vouchers as $v) {
                    $val = $v->discount_type == 'percent' ? "{$v->discount_value}%" : number_format($v->discount_value) . " VND";
                    $voucherStr .= "- Mã '{$v->code}': {$v->name} (Giảm $val)\n";
                }
            } else {
                $voucherStr = "Hiện không có khuyến mãi nào.";
            }

            $globalContext = "*** BÁCH KHOA TOÀN THƯ CỬA HÀNG ***\n";
            $globalContext .= "Cửa hàng đang kinh doanh các thương hiệu: {$brandStr}.\n";
            $globalContext .= "Các danh mục sản phẩm: {$categoryStr}.\n";
            $globalContext .= "Các chương trình khuyến mãi hiện có (Voucher):\n{$voucherStr}\n\n";
        } catch (\Exception $e) {
            // Bỏ qua lỗi truy xuất
        }

        // 2. DỮ LIỆU ĐỘNG (RAG - Tìm kiếm theo keyword)
        $lastUserMessage = "";
        foreach (array_reverse($request->messages) as $msg) {
            if ($msg['role'] === 'user') {
                $lastUserMessage = $msg['parts'][0]['text'];
                break;
            }
        }

        $contextString = "";
        $newsContextString = "";

        if (!empty($lastUserMessage)) {
            // Lọc ra các từ khóa dài hơn 2 ký tự
            $words = array_filter(explode(' ', mb_strtolower(preg_replace('/[^\p{L}\p{N}\s]/u', '', $lastUserMessage))), function($w) {
                return mb_strlen($w) > 2;
            });
            
            if (count($words) > 0) {
                // TÌM SẢN PHẨM
                $productQuery = \App\Models\Product::with(['category:id,name', 'brand:id,name'])->where('is_active', 1);
                $productQuery->where(function($q) use ($words) {
                    foreach ($words as $word) {
                        $q->orWhere('name', 'like', "%{$word}%");
                    }
                });
                $products = $productQuery->take(5)->get(['id', 'name', 'price', 'sale_price', 'slug', 'category_id', 'brand_id']);
                
                if ($products->count() > 0) {
                    $contextString = "\n*** KẾT QUẢ TÌM KIẾM SẢN PHẨM ***\n";
                    foreach($products as $prod) {
                        $priceStr = $prod->sale_price > 0 ? number_format($prod->sale_price, 0, ',', '.') : number_format($prod->price, 0, ',', '.');
                        $catName = $prod->category ? $prod->category->name : 'N/A';
                        $brandName = $prod->brand ? $prod->brand->name : 'N/A';
                        $contextString .= "- Tên sản phẩm: {$prod->name} (Hãng: $brandName, Thuộc: $catName), Giá bán: {$priceStr} VND, Link: /product/{$prod->slug}\n";
                    }
                    $contextString .= "Lưu ý quan trọng: Mỗi khi tư vấn các sản phẩm trên, BẠN BẮT BUỘC chèn đường link theo chuẩn Markdown: [Tên Sản Phẩm](/product/slug-san-pham).\n";
                }

                // TÌM TIN TỨC / CHÍNH SÁCH
                $newsQuery = \App\Models\News::where('is_active', 1)->where(function($q) {
                    $q->whereNull('published_at')->orWhere('published_at', '<=', now());
                });
                $newsQuery->where(function($q) use ($words) {
                    foreach ($words as $word) {
                        $q->orWhere('title', 'like', "%{$word}%");
                        $q->orWhere('summary', 'like', "%{$word}%");
                    }
                });
                $news = $newsQuery->take(3)->get(['id', 'title', 'summary', 'slug']);

                if ($news->count() > 0) {
                    $newsContextString = "\n*** KẾT QUẢ TÌM KIẾM BÀI VIẾT / CHÍNH SÁCH ***\n";
                    foreach($news as $n) {
                        $newsContextString .= "- Tiêu đề: {$n->title}\n  Tóm tắt: {$n->summary}\n  Link: /news/{$n->slug}\n";
                    }
                    $newsContextString .= "Lưu ý quan trọng: BẮT BUỘC điều hướng họ tới bài viết qua link Markdown nếu hỏi đúng chủ đề: [Tiêu đề](/news/slug-bai-viet).\n";
                }
            }
        }

        // 3. DỮ LIỆU HUẤN LUYỆN (TRAINING TXT)
        $trainingManual = "";
        try {
            $path = storage_path('app/chatbot_training.txt');
            if (file_exists($path)) {
                $trainingManual = "\n*** CẨM NANG HUẤN LUYỆN TỪ HỆ THỐNG ***\n" . file_get_contents($path);
            }
        } catch (\Exception $e) {
            // Không làm gián đoạn nếu lỗi đọc file
        }

        // Custom System Instruction for SpaceLink
        $systemText = "Bạn là trợ lý AI (SpaceLink Assistant) thông minh của cửa hàng điện thoại SpaceLink. 
Nhiệm vụ của bạn là hỗ trợ khách hàng nhanh chóng và chính xác ở MỌI CHỦ ĐỀ liên quan đến sản phẩm, dịch vụ, khuyến mãi, bài viết và chính sách của SpaceLink dựa vào Bách khoa toàn thư và Cẩm nang huấn luyện được cung cấp.
Với những vấn đề không liên quan đến công nghệ, cửa hàng, hãy khéo léo từ chối và lái câu chuyện về thế mạnh của SpaceLink.
Phản hồi tóm tắt, thân thiện, và luôn đưa ra các đường dẫn (Link Markdown) để khách hàng click.

Tuyệt đối tuân thủ cơ sở dữ liệu và hướng dẫn sau:
\n" . $globalContext . $contextString . $newsContextString . $trainingManual;

        $systemInstruction = [
            'parts' => [
                [
                    'text' => $systemText
                ]
            ]
        ];

        // Tối ưu hóa: Chỉ gửi tối đa 5 tin nhắn gần nhất (tránh vượt giới hạn Token Per Minute của Free Tier)
        $recentMessages = array_slice($request->messages, -5);
        // Gemini yêu cầu message đầu tiên phải từ user
        if (count($recentMessages) > 0 && $recentMessages[0]['role'] === 'model') {
            array_shift($recentMessages);
        }

        try {
            $response = Http::post($endpoint, [
                'systemInstruction' => $systemInstruction,
                'contents' => $recentMessages,
                'generationConfig' => [
                    'temperature' => 0.7,
                ]
            ]);

            if ($response->successful()) {
                $data = $response->json();
                
                // Trích xuất phản hồi từ Gemini
                if (isset($data['candidates'][0]['content']['parts'][0]['text'])) {
                    $replyText = $data['candidates'][0]['content']['parts'][0]['text'];
                    return response()->json([
                        'reply' => $replyText
                    ]);
                } else {
                    return response()->json(['error' => 'Unexpected response format from Gemini'], 500);
                }
            } else {
                Log::error('Gemini API error: ' . $response->body());
                return response()->json(['error' => 'Failed to connect to Gemini API'], $response->status());
            }

        } catch (\Exception $e) {
            Log::error('Gemini Connection error: ' . $e->getMessage());
            return response()->json(['error' => 'An error occurred while connecting to the chatbot.'], 500);
        }
    }
}
