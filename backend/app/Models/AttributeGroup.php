<?php
namespace App\Models;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class AttributeGroup extends Model {
    use HasFactory;
    protected $fillable = ['name', 'display_name', 'type', 'display_order'];

    public function attributes() {
        return $this->hasMany(Attribute::class);
    }
}