$body = @{
    mobile = "9701533362"
    otp = "755523"
} | ConvertTo-Json

try {
    $response = Invoke-RestMethod -Uri 'http://localhost:3000/api/auth/verify-otp' -Method POST -Headers @{'Content-Type'='application/json'} -Body $body
    Write-Host "Success:" -ForegroundColor Green
    $response | ConvertTo-Json -Depth 3
}
catch {
    Write-Host "Error:" -ForegroundColor Red
    Write-Host $_.Exception.Message
    if ($_.Exception.Response) {
        $reader = New-Object System.IO.StreamReader($_.Exception.Response.GetResponseStream())
        $responseBody = $reader.ReadToEnd()
        Write-Host "Response body: $responseBody" -ForegroundColor Yellow
    }
}
