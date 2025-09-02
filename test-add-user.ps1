# Test Add User API
$headers = @{
    "Content-Type" = "application/json"
    "Authorization" = "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJwaG9uZSI6Ijk3MDE1MzMzNjIiLCJpYXQiOjE3NTM3MTk3MTMsImV4cCI6MTc1Mzc0ODUxM30.1xUcTl-nS93geUhD87VDuv2wdJRNWHn3jP8qMUvWkNE"
}

$body = @{
    name = "Test User"
    mobile = "9876543210"
    email = "testuser@example.com"
    username = "testuser"
    designation_id = 3
    salary = 15000.00
    allowance = 2000.00
} | ConvertTo-Json

try {
    $response = Invoke-RestMethod -Uri "http://localhost:3000/api/users" -Method POST -Headers $headers -Body $body
    Write-Host "Response:" -ForegroundColor Green
    $response | ConvertTo-Json -Depth 3
} catch {
    Write-Host "Error:" -ForegroundColor Red
    Write-Host $_.Exception.Message
    if ($_.Exception.Response) {
        $reader = New-Object System.IO.StreamReader($_.Exception.Response.GetResponseStream())
        $responseBody = $reader.ReadToEnd()
        Write-Host "Response Body: $responseBody"
    }
}
