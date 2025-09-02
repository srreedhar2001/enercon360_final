# Test Add Representative with Manager
$headers = @{
    "Content-Type" = "application/json"
    "Authorization" = "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJwaG9uZSI6Ijk3MDE1MzMzNjIiLCJpYXQiOjE3NTM3MTk3MTMsImV4cCI6MTc1Mzc0ODUxM30.1xUcTl-nS93geUhD87VDuv2wdJRNWHn3jP8qMUvWkNE"
}

$body = @{
    name = "John Representative"
    mobile = "9876543211"
    email = "john.rep@example.com"
    username = "johnrep"
    designation_id = 2
    managerID = 29
    salary = 18000.00
    allowance = 3000.00
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
