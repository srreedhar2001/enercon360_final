$body = @{
    mobile = "9701533362"
    otp = "726764"
} | ConvertTo-Json

Write-Host "Testing OTP verification with:" -ForegroundColor Yellow
Write-Host "Mobile: 9701533362"
Write-Host "OTP: 726764"
Write-Host "JSON Body: $body"
Write-Host ""

try {
    $response = Invoke-RestMethod -Uri 'http://localhost:3000/api/auth/verify-otp' -Method POST -Headers @{'Content-Type'='application/json'} -Body $body
    Write-Host "SUCCESS:" -ForegroundColor Green
    $response | ConvertTo-Json -Depth 3
}
catch {
    Write-Host "ERROR:" -ForegroundColor Red
    Write-Host "Exception Message: $($_.Exception.Message)"
    
    if ($_.Exception.Response) {
        $statusCode = $_.Exception.Response.StatusCode.value__
        Write-Host "Status Code: $statusCode" -ForegroundColor Red
        
        try {
            $reader = New-Object System.IO.StreamReader($_.Exception.Response.GetResponseStream())
            $responseBody = $reader.ReadToEnd()
            Write-Host "Response Body: $responseBody" -ForegroundColor Yellow
        }
        catch {
            Write-Host "Could not read response body" -ForegroundColor Red
        }
    }
}
