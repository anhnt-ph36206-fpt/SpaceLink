<?php

namespace App\Http\Controllers\Api\Client;

use App\Http\Controllers\Controller;
use App\Models\Contact;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Validator;

class ContactController extends Controller
{
    /**
     * POST /api/client/contacts
     * Submit contact form
     */
    public function store(Request $request)
    {
        $validator = Validator::make($request->all(), [
            'fullname' => 'required|string|max:255',
            'email'   => 'required|email|max:255',
            'phone'   => 'nullable|string|max:20',
            'subject' => 'required|string|max:255',
            'message' => 'required|string|max:2000',
        ]);

        if ($validator->fails()) {
            return response()->json([
                'status'  => 'error',
                'message' => 'Dữ liệu không hợp lệ.',
                'errors'  => $validator->errors()
            ], 422);
        }

        try {
            $contact = Contact::create([
                'fullname' => $request->fullname,
                'email'   => $request->email,
                'phone'   => $request->phone,
                'subject' => $request->subject,
                'message' => $request->message,
                'status'  => 'pending',
            ]);

            return response()->json([
                'status'  => 'success',
                'message' => 'Thông tin của bạn đã được gửi. Chúng tôi sẽ sớm liên hệ lại!',
                'data'    => $contact
            ], 201);
        } catch (\Exception $e) {
            return response()->json([
                'status'  => 'error',
                'message' => 'Lỗi khi gửi thông tin liên hệ.',
                'error'   => $e->getMessage()
            ], 500);
        }
    }
}
