<?php

namespace App\Http\Controllers\Api\Client;

use App\Http\Controllers\Controller;
use App\Models\Brand;
use App\Http\Resources\BrandResource;
use Illuminate\Http\Request;
use OpenApi\Attributes as OA;

class BrandController extends Controller
{
    #[OA\Get(
        path: '/api/brands',
        summary: 'Danh sách thương hiệu đang hoạt động',
        tags: ['Client - Brands'],
        responses: [
            new OA\Response(
                response: 200,
                description: 'Thành công',
                content: new OA\JsonContent(
                    properties: [
                        new OA\Property(property: 'data', type: 'array', items: new OA\Items(
                            properties: [
                                new OA\Property(property: 'id',            type: 'integer'),
                                new OA\Property(property: 'name',          type: 'string'),
                                new OA\Property(property: 'slug',          type: 'string'),
                                new OA\Property(property: 'logo',          type: 'string', nullable: true),
                                new OA\Property(property: 'display_order', type: 'integer'),
                            ]
                        )),
                    ]
                )
            ),
        ]
    )]
    public function index()
    {
        $brands = Brand::where('is_active', true)
            ->orderBy('display_order', 'asc')
            ->get();

        return BrandResource::collection($brands);
    }
}
