<?php
namespace App\Models;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Support\Facades\Storage;


class ProductImage extends Model
{
    public $timestamps = false; // Chỉ có created_at

    protected $fillable = [
        'product_id',
        'image_path',
        'is_primary',
        'display_order',
    ];

    protected $casts = [
        'is_primary' => 'boolean',
    ];

    // Accessor: trả về full URL của ảnh
    public function getImageUrlAttribute(): ?string
    {
        if (!$this->image_path) return null;
        // Nếu image_path đã là URL đầy đủ thì trả về luôn
        if (str_starts_with($this->image_path, 'http')) return $this->image_path;
        return asset('storage/' . $this->image_path);
    }

    /**
     * Relationships
     */

    // Image belongs to product
    public function product()
    {
        return $this->belongsTo(Product::class);
    }
}
