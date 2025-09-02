$body = @{
    mobile = "9701533362"
    otp = "293534"
} | ConvertTo-Json

try {
    $response = Invoke-RestMethod -Uri 'http://localhost:3000/api/auth/verify-otp' -Method POST -Headers @{'Content-Type'='application/json'} -Body $body
    Write-Host "Verification Success:" -ForegroundColor Green
    $response | ConvertTo-Json -Depth 3
    
    Write-Host "`nToken:" -ForegroundColor Yellow
    Write-Host $response.token
    
    Write-Host "`nUser Info:" -ForegroundColor Yellow
    $response.user | ConvertTo-Json -Depth 2
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
