let data_men;
let data_fem;
let studies;
let options;

Promise.all([
    d3.json("male_at_tu.json"),
    d3.json("female_at_tu.json")
]).then(function(data){
    data_men = data[0];
    data_fem = data[1];

    let fem_perc = [];
    for(var i = 0; i < Object.values(data_men["Totaal"]).length; i++){
        var calc_percent = (Object.values(data_fem["Totaal"])[i]/(Object.values(data_men["Totaal"])[i]+Object.values(data_fem["Totaal"])[i]))*100;
        if (isNaN(calc_percent)){
          fem_perc.push(0);
        } else {
          fem_perc.push(calc_percent.toFixed(1));
        }
    };

    studies = [];
    let exceptions = ["alle lessen", "enkele lessen", "ijker", "nan", "Totaal"];
    for(let i=0; i < Object.keys(data_fem).length; i++) {
        if(exceptions.includes(Object.keys(data_fem)[i])){
        } else {
          studies.push({
            name: Object.keys(data_fem)[i], 
            type: 'bar', 
            data: Object.values(data_fem[Object.keys(data_fem)[i]]) 
          })
        }
    };

    options = {
        series: [
            ...studies
        ],
        chart: {
            type: 'bar',
            height: 350,
            stacked: true,
            toolbar: {
                show: true
            },
            zoom: {
                enabled: true
            }
        },
        responsive: [{
            breakpoint: 480,
            options: {
                legend: {
                    position: 'bottom',
                    offsetX: -10,
                    offsetY: 0
                }
            }
        }],
        plotOptions: {
            bar: {
                horizontal: false,
                borderRadius: 10
            },
        },
        dataLabels: {
            enabled: false
        },
        xaxis: {
            categories: Object.keys(data_fem["Totaal"]),
            type: 'datetime'
        },
        yaxis: {
            title: {
                text: "Amount of female students per program"
            },
        },
        legend: {
            position: 'right',
            offsetY: 40
        },
        fill: {
            opacity: 1
        }
    };

    let chart = new ApexCharts(document.querySelector("#plot"), options);
    chart.render();


});