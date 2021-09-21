var import_data;
Promise.all([
        d3.json("male_at_tu.json"),
        d3.json("female_at_tu.json")
]).then(function(data){

        import_data = data;
        var elmts = Object.keys(import_data[0]);
        var select = document.getElementById("arr");

        $.each(elmts, function(i, p) {
          $('#arr').append($('<option></option>')
            .val(p).html(p));
        });
});



function graphing() {
  var selected = document.getElementById('arr');
  var value = selected.options[selected.selectedIndex].value;
  data_graph(import_data[0], import_data[1], value);
};

function data_graph(data_men, data_fem, param) {

  var fem_perc = [];
  for(var i = 0; i < Object.values(data_men["Totaal"]).length; i++){
    var calc_percent = (Object.values(data_fem["Totaal"])[i]/(Object.values(data_men["Totaal"])[i]+Object.values(data_fem["Totaal"])[i]))*100;
    if (isNaN(calc_percent)){
      fem_perc.push(0);
    } else {
      fem_perc.push(calc_percent.toFixed(1));
    }
  };

  let studies = [];
  let exceptions = ["alle lessen", "enkele lessen", "ijker", "nan", "Totaal"]
  for(let i=0; i < Object.keys(data_fem).length; i++) {
    if(exceptions.includes(Object.keys(data_fem)[i])){
    } else {
      studies.push({
        name: Object.keys(data_fem)[i], 
        type: 'column', 
        data: Object.values(data_fem[Object.keys(data_fem)[i]]) 
      })
      // alert({data: Object.values(data_fem[Object.keys(data_fem)[i]])})
      // alert(Object.keys(data_fem)[i])
    }
  }
  // alert(studies)

  var options = {
          series: [...studies,
        // {
        //   name: 'Female',
        //   type: 'column',
        //   data: Object.values(data_fem[param]),
        // }, 
        // {
        //   name: 'Percentage',
        //   type: 'area',
        //   data: fem_perc,
        // }
      ], 
          chart: {
          // height: 350,
          type: 'column',
          stacked: true
        },
        dataLabels: {
          enabled: false
        },
        stroke: {
          width: [1,4],
          curve: 'straight'
          // show: true,
          // width: 2,
          // colors: ['transparent'],
        },
        markers: {
          size: 0,
        },
        title: {
          text: 'Female students at TU Delft',
          align: 'left'
        },
        // fill: {
        //   type: 'gradient',
        //   gradient: {
        //     shadeIntensity: 1,
        //     inverseColors: false,
        //     opacityFrom: 0.5,
        //     opacityTo: 0,
        //     stops: [0, 90, 100]
        //   },
        // },
        xaxis: {
          categories: Object.keys(data_fem[param]),
          type: 'datetime',
        },
        yaxis: [
          {
            // showForNullSeries: false,
            // showForZeroSeries: false,
            axisTicks: {
              show: true,
            },
            axisBorder: {
              show: true,
              color: '#008FFB'
            },
            labels: {
              style: {
                colors: '#008FFB',
              }
            },
            title: {
              text: "Amount of female students",
              style: {
                color: '#008FFB',
              }
            },
            tooltip: {
              enabled: true
            }
          },
        //   {
        //     seriesName: 'Percentage',
        //     opposite: true,
        //     axisTicks: {
        //       show: true,
        //     },
        //     axisBorder:{
        //       show: true,
        //       color: '#00E396'
        //     },
        //     labels: {
        //       style: {
        //         colors: '#00E396',
        //       }
        //     },
        //     // title: {
        //     //   text: 'Female percentage',
        //     //   style: {
        //     //     color: '#00E396',
        //     // }
        //   // }
        // }
        ],
        fill: {
          opacity: 1
        },
        tooltip: {
          y: {
            formatter: function (val) {
              return val + " students"
            }
          }
        }
        };

        var chart = new ApexCharts(document.querySelector("#plot"), options);
        chart.render();

        // let exceptions = ["alle lessen", "enkele lessen", "ijker", "nan", "Totaal"];
        // for(let i=0; i < Object.keys(data_fem).length; i++) {
        //   if(exceptions.includes(Object.keys(data_fem)[i])){
        //   } else {
        //     chart.appendSeries({
        //       name: Object.keys(data_fem)[i], 
        //       type: 'column', 
        //       data: Object.values(data_fem[Object.keys(data_fem)[i]]) 
        //     })
        //   }
        // }

        // chart.appendSeries({
        //   name: Object.keys(data_fem)[2], 
        //   type: 'column', 
        //   data: Object.values(data_fem[Object.keys(data_fem)[2]]) 
        // })

};

