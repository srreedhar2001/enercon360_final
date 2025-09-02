try {
    $response = Invoke-WebRequest -Uri 'http://localhost:3000/' -Method GET
    Write-Host "Root response status:" $response.StatusCode -ForegroundColor Green
    Write-Host "Content length:" $response.Content.Length
}
catch {
    Write-Host "Error:" -ForegroundColor Red
    Write-Host $_.Exception.Message
}
